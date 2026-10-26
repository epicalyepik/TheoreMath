import { unzipSync, strFromU8 } from 'fflate';
import type { Carpeta, NodoLib, ProblemaImport, ResultadoImport, Ubicado } from '../model/types';
import { dedupe, idDesdeNombre, leerMetaCarpeta, normalizarNodo, tituloDesdeNombre } from './normalize';

export interface Entrada {
  /** Ruta relativa con "/" (ej. "Analisis/01-limites.json"). */
  ruta: string;
  datos: Uint8Array;
}

const META = '_carpeta.json';
const MAX_BYTES = 20 * 1024 * 1024;

const ignorar = (ruta: string) => ruta.split('/').some((p) => p.startsWith('.') || p === '__MACOSX');
const esZip = (d: Uint8Array) => d.length > 3 && d[0] === 0x50 && d[1] === 0x4b && d[2] === 0x03 && d[3] === 0x04;
const nombreDe = (ruta: string) => ruta.split('/').pop() ?? ruta;

function parsear(entrada: Entrada, problemas: ProblemaImport[]): unknown | undefined {
  try {
    return JSON.parse(strFromU8(entrada.datos).replace(/^﻿/, ''));
  } catch (e) {
    problemas.push({ archivo: entrada.ruta, mensaje: `JSON mal formado: ${(e as Error).message}` });
    return undefined;
  }
}

/** Expande los .zip a sus archivos internos (con la ruta prefijada por la carpeta del zip). */
export function expandir(entradas: Entrada[], problemas: ProblemaImport[]): Entrada[] {
  const salida: Entrada[] = [];
  for (const e of entradas) {
    if (e.datos.length > MAX_BYTES) {
      problemas.push({ archivo: e.ruta, mensaje: 'archivo demasiado grande (máx. 20 MB)' });
      continue;
    }
    if (esZip(e.datos)) {
      try {
        const dir = e.ruta.includes('/') ? e.ruta.slice(0, e.ruta.lastIndexOf('/') + 1) : '';
        const archivos = unzipSync(e.datos, { filter: (f) => f.name.toLowerCase().endsWith('.json') && !ignorar(f.name) });
        for (const [ruta, datos] of Object.entries(archivos)) salida.push({ ruta: dir + ruta, datos });
      } catch (err) {
        problemas.push({ archivo: e.ruta, mensaje: `no se pudo abrir el ZIP: ${(err as Error).message}` });
      }
    } else if (e.ruta.toLowerCase().endsWith('.json') || !e.ruta.includes('.')) {
      if (!ignorar(e.ruta)) salida.push(e);
    } else {
      problemas.push({ archivo: e.ruta, mensaje: 'se ignoró: solo se aceptan .json o .zip' });
    }
  }
  return salida;
}

interface Dir {
  nombre: string;
  dirs: Map<string, Dir>;
  archivos: Entrada[];
  meta?: Entrada;
}

const nuevoDir = (nombre: string): Dir => ({ nombre, dirs: new Map(), archivos: [] });
const comparar = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });

function armarArbol(entradas: Entrada[]): Dir {
  const raiz = nuevoDir('');
  for (const e of entradas) {
    const partes = e.ruta.split('/').filter(Boolean);
    let d = raiz;
    for (const p of partes.slice(0, -1)) {
      if (!d.dirs.has(p)) d.dirs.set(p, nuevoDir(p));
      d = d.dirs.get(p)!;
    }
    if (nombreDe(e.ruta) === META) d.meta = e;
    else d.archivos.push(e);
  }
  return raiz;
}

function nodosDe(d: Dir, problemas: ProblemaImport[], rutaDir: string): Ubicado[] {
  const items: { orden: string; u: Ubicado }[] = [];
  for (const sub of [...d.dirs.values()]) {
    const c = carpetaDe(sub, problemas, rutaDir + sub.nombre + '/');
    if (c) items.push({ orden: sub.nombre, u: { ruta: [], nodo: c } });
  }
  for (const a of d.archivos) {
    const raw = parsear(a, problemas);
    if (raw === undefined) continue;
    // Una copia exportada trae varios nodos raíz en "biblioteca".
    const copia = typeof raw === 'object' && raw !== null && Array.isArray((raw as { biblioteca?: unknown }).biblioteca);
    const crudos = copia ? ((raw as { biblioteca: unknown[] }).biblioteca) : [raw];
    crudos.forEach((c, i) => {
      const r = normalizarNodo(c, { archivo: a.ruta, problemas }, idDesdeNombre(nombreDe(a.ruta)) + (copia ? `-${i + 1}` : ''));
      if (!r) return;
      const ruta = r.dentroDe ? r.dentroDe.split('/').map((s) => s.trim()).filter(Boolean) : [];
      items.push({ orden: `${nombreDe(a.ruta)}\u0000${String(i).padStart(4, '0')}`, u: { ruta, nodo: r.nodo } });
    });
  }
  items.sort((a, b) => comparar(a.orden, b.orden));
  return items.map((i) => i.u);
}

function carpetaDe(d: Dir, problemas: ProblemaImport[], rutaDir: string): Carpeta | null {
  const ctx = { archivo: rutaDir + META, problemas };
  const raw = d.meta ? parsear(d.meta, problemas) : undefined;
  const meta = raw !== undefined ? leerMetaCarpeta(raw, ctx) : {};
  const hijosU = nodosDe(d, problemas, rutaDir);
  // Dentro de una carpeta, "dentro_de" no aplica: la ubicación la da la carpeta.
  const hijos = dedupe(
    hijosU.map((u) => u.nodo),
    { archivo: rutaDir, problemas },
    rutaDir,
  );
  if (hijos.length === 0) return null;
  return {
    tipo: 'carpeta',
    id: meta.id ?? idDesdeNombre(d.nombre),
    titulo: meta.titulo ?? tituloDesdeNombre(d.nombre),
    ...(meta.subtitulo ? { subtitulo: meta.subtitulo } : {}),
    ...(meta.sigla ? { sigla: meta.sigla } : {}),
    ...(meta.acento ? { acento: meta.acento } : {}),
    ...(meta.orden !== undefined ? { orden: meta.orden } : {}),
    hijos,
  };
}

function contar(n: NodoLib): { cartas: number; mazos: number } {
  if (n.tipo === 'mazo') return { cartas: n.cartas.length, mazos: 1 };
  return n.hijos.map(contar).reduce((a, b) => ({ cartas: a.cartas + b.cartas, mazos: a.mazos + b.mazos }), { cartas: 0, mazos: 0 });
}

/**
 * Importa archivos sueltos (.json), ZIPs y carpetas (rutas con "/").
 * Cada carpeta se vuelve un nodo; cada .json, un nodo (mazo o árbol).
 */
export function importarEntradas(entradas: Entrada[]): ResultadoImport {
  const problemas: ProblemaImport[] = [];
  const planas = expandir(entradas, problemas);
  const raiz = armarArbol(planas);
  if (raiz.meta) problemas.push({ archivo: META, mensaje: 'se ignoró: _carpeta.json debe estar dentro de una carpeta' });
  // Primero los que van en la raíz, así los "dentro_de" caen en carpetas ya creadas.
  const nodos = nodosDe(raiz, problemas, '').sort((a, b) => Number(a.ruta.length > 0) - Number(b.ruta.length > 0));
  const total = nodos.map((u) => contar(u.nodo)).reduce((a, b) => ({ cartas: a.cartas + b.cartas, mazos: a.mazos + b.mazos }), { cartas: 0, mazos: 0 });
  if (planas.length === 0 && problemas.length === 0) problemas.push({ archivo: '—', mensaje: 'no se encontró ningún .json' });
  return { nodos, problemas, ...total };
}

export async function entradasDesdeFiles(files: FileList | File[]): Promise<Entrada[]> {
  return Promise.all(
    [...files].map(async (f) => ({
      ruta: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      datos: new Uint8Array(await f.arrayBuffer()),
    })),
  );
}
