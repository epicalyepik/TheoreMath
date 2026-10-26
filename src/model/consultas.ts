import { ordenados, todosLosMazos } from '../import/merge';
import type { CartaT } from './schema';
import type { Biblioteca, Mazo, NodoLib } from './types';

export type Acento = 'cian' | 'rosa';

/** Recorre una ruta de ids y devuelve los nodos atravesados (vacío si no existe). */
export function cadena(bib: Biblioteca, ruta: string[]): NodoLib[] {
  const out: NodoLib[] = [];
  let hermanos = bib.raices;
  for (const id of ruta) {
    const n = hermanos.find((h) => h.id === id);
    if (!n) return [];
    out.push(n);
    hermanos = n.tipo === 'carpeta' ? n.hijos : [];
  }
  return out;
}

/** Acento heredado: el del nodo más cercano que lo defina; si no, alterna por materia. */
export function acentoDe(bib: Biblioteca, ruta: string[]): Acento {
  const nodos = cadena(bib, ruta);
  for (let i = nodos.length - 1; i >= 0; i--) {
    const a = nodos[i].acento;
    if (a) return a;
  }
  const raiz = ordenados(bib.raices).findIndex((n) => n.id === ruta[0]);
  return raiz % 2 === 1 ? 'rosa' : 'cian';
}

export function ubicarMazo(bib: Biblioteca, ruta: string[]): { mazo: Mazo; titulos: string[]; acento: Acento } | null {
  const nodos = cadena(bib, ruta);
  const ultimo = nodos[nodos.length - 1];
  if (!ultimo || ultimo.tipo !== 'mazo') return null;
  return { mazo: ultimo, titulos: nodos.map((n) => n.titulo), acento: acentoDe(bib, ruta) };
}

/** Busca una carta por id en toda la biblioteca (para "relacionadas" entre mazos). */
export function buscarCartaGlobal(bib: Biblioteca, id: string): { ruta: string[]; carta: CartaT } | null {
  for (const m of todosLosMazos(bib)) {
    const carta = m.mazo.cartas.find((c) => c.id === id);
    if (carta) return { ruta: m.ruta, carta };
  }
  return null;
}

const plano = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function textoDeCarta(c: CartaT): string {
  const f = c.frente;
  const d = c.dorso ?? {};
  return [
    c.titulo,
    c.subtitulo,
    ...(c.etiquetas ?? []),
    f.definicion,
    f.nota,
    ...(f.pasos ?? []),
    ...(f.variantes ?? []).map((v) => v.nombre),
    d.en_cristiano,
    d.cuando_usarlo,
  ]
    .filter(Boolean)
    .join(' ');
}

export interface Resultado {
  tipo: 'mazo' | 'carta';
  ruta: string[];
  titulos: string[];
  mazo: Mazo;
  carta?: CartaT;
  puntaje: number;
}

export function buscar(bib: Biblioteca, consulta: string, max = 60): Resultado[] {
  const palabras = plano(consulta).split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  const out: Resultado[] = [];
  for (const m of todosLosMazos(bib)) {
    const ruta = plano(m.titulos.join(' '));
    const tituloMazo = ruta + ' ' + plano(m.mazo.subtitulo ?? '');
    if (palabras.every((p) => tituloMazo.includes(p))) out.push({ tipo: 'mazo', ruta: m.ruta, titulos: m.titulos, mazo: m.mazo, puntaje: 3 });
    for (const c of m.mazo.cartas) {
      const titulo = plano(c.titulo + ' ' + (c.subtitulo ?? ''));
      const todo = plano(textoDeCarta(c)) + ' ' + ruta;
      if (!palabras.every((p) => todo.includes(p))) continue;
      const puntaje = palabras.every((p) => titulo.includes(p)) ? (titulo.startsWith(palabras[0]) ? 5 : 4) : 1;
      out.push({ tipo: 'carta', ruta: m.ruta, titulos: m.titulos, mazo: m.mazo, carta: c, puntaje });
    }
  }
  return out.sort((a, b) => b.puntaje - a.puntaje).slice(0, max);
}
