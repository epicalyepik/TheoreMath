import type { Biblioteca, Carpeta, Fuente, Mazo, NodoLib, Ubicado } from '../model/types';
import { tituloDesdeNombre } from './normalize';

/**
 * Fusiona un nodo dentro de una lista de hermanos:
 * - carpeta + carpeta con el mismo id → se combinan sus hijos (recursivo) y se actualizan los datos;
 * - cualquier otro caso con el mismo id → el nuevo reemplaza al viejo (en el mismo lugar);
 * - id nuevo → se agrega al final.
 */
export function fusionar(hermanos: NodoLib[], nuevo: NodoLib): NodoLib[] {
  const i = hermanos.findIndex((h) => h.id === nuevo.id);
  if (i < 0) return [...hermanos, nuevo];
  const viejo = hermanos[i];
  let combinado: NodoLib = nuevo;
  if (viejo.tipo === 'carpeta' && nuevo.tipo === 'carpeta') {
    combinado = { ...viejo, ...nuevo, hijos: nuevo.hijos.reduce(fusionar, viejo.hijos) };
  }
  const copia = [...hermanos];
  copia[i] = combinado;
  return copia;
}

function insertarEn(hermanos: NodoLib[], ruta: string[], nodo: NodoLib): NodoLib[] {
  if (ruta.length === 0) return fusionar(hermanos, nodo);
  const [cab, ...resto] = ruta;
  const i = hermanos.findIndex((h) => h.id === cab);
  const existente = i >= 0 ? hermanos[i] : undefined;
  const carpeta: Carpeta =
    existente?.tipo === 'carpeta' ? existente : { tipo: 'carpeta', id: cab, titulo: tituloDesdeNombre(cab), hijos: [] };
  const actualizada: Carpeta = { ...carpeta, hijos: insertarEn(carpeta.hijos, resto, nodo) };
  if (i < 0) return [...hermanos, actualizada];
  const copia = [...hermanos];
  copia[i] = actualizada;
  return copia;
}

export function insertar(bib: Biblioteca, ubicados: Ubicado[], fuente?: Fuente): Biblioteca {
  let raices = bib.raices;
  for (const u of ubicados) raices = insertarEn(raices, u.ruta, fuente ? { ...u.nodo, fuente } : u.nodo);
  return { ...bib, raices };
}

export function eliminar(bib: Biblioteca, ruta: string[]): Biblioteca {
  const quitar = (hermanos: NodoLib[], r: string[]): NodoLib[] => {
    if (r.length === 1) return hermanos.filter((h) => h.id !== r[0]);
    return hermanos.map((h) => (h.id === r[0] && h.tipo === 'carpeta' ? { ...h, hijos: quitar(h.hijos, r.slice(1)) } : h));
  };
  return { ...bib, raices: quitar(bib.raices, ruta) };
}

export function buscarNodo(bib: Biblioteca, ruta: string[]): NodoLib | undefined {
  let hermanos = bib.raices;
  let nodo: NodoLib | undefined;
  for (const id of ruta) {
    nodo = hermanos.find((h) => h.id === id);
    if (!nodo) return undefined;
    hermanos = nodo.tipo === 'carpeta' ? nodo.hijos : [];
  }
  return nodo;
}

/** Hermanos ordenados para mostrar: primero por `orden` (si lo tienen), si no por orden de llegada. */
export function ordenados(nodos: NodoLib[]): NodoLib[] {
  return nodos
    .map((n, i) => ({ n, k: n.orden ?? Number.MAX_SAFE_INTEGER, i }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.n);
}

export function contarCartas(n: NodoLib): number {
  return n.tipo === 'mazo' ? n.cartas.length : n.hijos.reduce((s, h) => s + contarCartas(h), 0);
}

export interface MazoUbicado {
  ruta: string[];
  mazo: Mazo;
  titulos: string[];
}

export function todosLosMazos(bib: Biblioteca): MazoUbicado[] {
  const out: MazoUbicado[] = [];
  const rec = (nodos: NodoLib[], ruta: string[], titulos: string[]) => {
    for (const n of ordenados(nodos)) {
      if (n.tipo === 'mazo') out.push({ ruta: [...ruta, n.id], mazo: n, titulos: [...titulos, n.titulo] });
      else rec(n.hijos, [...ruta, n.id], [...titulos, n.titulo]);
    }
  };
  rec(bib.raices, [], []);
  return out;
}
