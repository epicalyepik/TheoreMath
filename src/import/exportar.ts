import { FORMATO, type NodoEntrada } from '../model/schema';
import type { Biblioteca, NodoLib } from '../model/types';

function aEntrada(n: NodoLib): NodoEntrada {
  const base: NodoEntrada = {
    id: n.id,
    titulo: n.titulo,
    ...(n.subtitulo ? { subtitulo: n.subtitulo } : {}),
    ...(n.sigla ? { sigla: n.sigla } : {}),
    ...(n.acento ? { acento: n.acento } : {}),
    ...(n.orden !== undefined ? { orden: n.orden } : {}),
  };
  return n.tipo === 'mazo' ? { ...base, cartas: n.cartas } : { ...base, hijos: n.hijos.map(aEntrada) };
}

/** Toda la biblioteca en el mismo formato que se importa: sirve de copia y para pasarla a otro dispositivo. */
export function exportarBiblioteca(bib: Biblioteca): { formato: string; biblioteca: NodoEntrada[] } {
  return { formato: FORMATO, biblioteca: bib.raices.map(aEntrada) };
}

export function descargarCopia(bib: Biblioteca) {
  const json = JSON.stringify(exportarBiblioteca(bib), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `theoremath-copia-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
