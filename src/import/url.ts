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

async function entradasGitHub(g: RepoGitHub): Promise<Entrada[]> {
  const api = `https://api.github.com/repos/${g.owner}/${g.repo}`;
  let rama = g.rama;
  if (!rama) {
    const info = JSON.parse(new TextDecoder().decode(await descargar(api)));
    rama = info.default_branch;
  }
  const arbol = JSON.parse(new TextDecoder().decode(await descargar(`${api}/git/trees/${encodeURIComponent(rama)}?recursive=1`)));
  const prefijo = g.ruta ? g.ruta.replace(/\/$/, '') + '/' : '';
  const base = g.ruta ? g.ruta.split('/').slice(0, -1).join('/') : '';
  const blobs: string[] = (arbol.tree as { path: string; type: string }[])
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
