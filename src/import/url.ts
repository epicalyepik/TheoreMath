import type { ResultadoImport } from '../model/types';
import { importarEntradas, type Entrada } from './files';

interface RepoGitHub {
  owner: string;
  repo: string;
  rama: string;
  ruta: string;
}

// https://github.com/<owner>/<repo>/tree/<rama>/<ruta…>  (o la raíz del repo)
export function parsearCarpetaGitHub(url: URL): RepoGitHub | null {
  if (url.hostname !== 'github.com') return null;
  const p = url.pathname.split('/').filter(Boolean);
  if (p.length === 2) return { owner: p[0], repo: p[1].replace(/\.git$/, ''), rama: '', ruta: '' };
  if (p.length >= 4 && p[2] === 'tree') return { owner: p[0], repo: p[1], rama: p[3], ruta: p.slice(4).join('/') };
  return null;
}

// Links "normales" que no sirven para descargar se convierten a su versión cruda.
export function urlCruda(url: URL): URL {
  if (url.hostname === 'github.com') {
    const p = url.pathname.split('/').filter(Boolean);
    if (p.length >= 5 && p[2] === 'blob') {
      return new URL(`https://raw.githubusercontent.com/${p[0]}/${p[1]}/${p.slice(3).map(decodeURIComponent).join('/')}`);
    }
  }
  if (url.hostname === 'gist.github.com' && !url.pathname.endsWith('/raw')) {
    return new URL(url.pathname.replace(/\/$/, '') + '/raw', 'https://gist.githubusercontent.com');
  }
  if (url.hostname === 'www.dropbox.com' || url.hostname === 'dropbox.com') {
    const u = new URL(url);
    u.searchParams.set('dl', '1');
    u.hostname = 'dl.dropboxusercontent.com';
    return u;
  }
  return url;
}

async function descargar(url: string | URL): Promise<Uint8Array> {
  let r: Response;
  try {
    r = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error(
      'no se pudo descargar. Revisá la conexión, o el sitio no permite descargas desde otras páginas (Google Drive no lo permite: usá GitHub, un Gist o Dropbox).',
    );
  }
  if (!r.ok) throw new Error(`el servidor respondió ${r.status} ${r.statusText}`.trim());
  return new Uint8Array(await r.arrayBuffer());
}

const leerJson = async (url: string) => JSON.parse(new TextDecoder().decode(await descargar(url)));

async function entradasGitHub(g0: RepoGitHub): Promise<Entrada[]> {
  const api = `https://api.github.com/repos/${g0.owner}/${g0.repo}`;
  let g = g0;
  let arbol: { tree: { path: string; type: string }[] } | undefined;
  if (!g.rama) {
    g = { ...g, rama: (await leerJson(api)).default_branch };
    arbol = await leerJson(`${api}/git/trees/${encodeURIComponent(g.rama)}?recursive=1`);
  } else {
    // En la URL no se distingue dónde termina la rama ("feature/x") y empieza la ruta:
    // se prueba con 1, 2, 3… segmentos hasta que la rama exista.
    const partes = [g.rama, ...g.ruta.split('/').filter(Boolean)];
    for (let n = 1; n <= Math.min(partes.length, 5) && !arbol; n++) {
      const rama = partes.slice(0, n).join('/');
      try {
        arbol = await leerJson(`${api}/git/trees/${encodeURIComponent(rama)}?recursive=1`);
        g = { ...g, rama, ruta: partes.slice(n).join('/') };
      } catch (e) {
        if (n === Math.min(partes.length, 5)) throw e;
      }
    }
  }
  if (!arbol) throw new Error('no se encontró la rama en GitHub');
  const rama = g.rama;
  const prefijo = g.ruta ? g.ruta.replace(/\/$/, '') + '/' : '';
  const base = g.ruta ? g.ruta.split('/').slice(0, -1).join('/') : '';
  const blobs: string[] = arbol.tree
    .filter((t) => t.type === 'blob' && t.path.startsWith(prefijo) && t.path.toLowerCase().endsWith('.json'))
    .map((t) => t.path)
    .filter((p) => !p.split('/').some((s) => s.startsWith('.')) && !/(^|\/)(package(-lock)?|tsconfig.*)\.json$/.test(p));
  if (blobs.length === 0) throw new Error('no hay archivos .json en esa carpeta de GitHub');
  if (blobs.length > 300) throw new Error('la carpeta tiene demasiados archivos (máx. 300)');
  return Promise.all(
    blobs.map(async (p) => ({
      // La carpeta elegida queda como nodo raíz (se conserva su nombre).
      ruta: base ? p.slice(base.length + 1) : p,
      datos: await descargar(`https://raw.githubusercontent.com/${g.owner}/${g.repo}/${rama}/${p.split('/').map(encodeURIComponent).join('/')}`),
    })),
  );
}

export async function importarDesdeUrl(texto: string): Promise<ResultadoImport> {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    throw new Error('eso no parece un link válido');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('solo se aceptan links http(s)');
  const gh = parsearCarpetaGitHub(url);
  if (gh) return importarEntradas(await entradasGitHub(gh));
  const cruda = urlCruda(url);
  const nombre = decodeURIComponent(cruda.pathname.split('/').filter(Boolean).pop() ?? 'descarga.json');
  const datos = await descargar(cruda);
  return importarEntradas([{ ruta: /\.(json|zip)$/i.test(nombre) ? nombre : `${nombre}.json`, datos }]);
}
