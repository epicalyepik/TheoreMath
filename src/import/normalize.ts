import { z } from 'zod';
import { Carta, FORMATO, MetaCarpeta, MetaNodo, type CartaT, type MetaCarpetaT } from '../model/schema';
import type { Carpeta, Mazo, NodoLib, ProblemaImport } from '../model/types';
import { erroresGrafico } from '../math/grafico';

z.config(z.locales.es());

export function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\.json$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sin-nombre'
  );
}

const sinPrefijo = (nombre: string) => nombre.replace(/\.json$/i, '').replace(/^\d+[\s._-]+/, '');

// "02_limites-y-continuidad.json" -> "limites-y-continuidad"
export const idDesdeNombre = (nombre: string) => slug(sinPrefijo(nombre));

// "02_limites-y-continuidad" -> "Limites y continuidad"
export function tituloDesdeNombre(nombre: string): string {
  const limpio = sinPrefijo(nombre)
    .replace(/[_-]+/g, ' ')
    .trim();
  return limpio ? limpio[0].toUpperCase() + limpio.slice(1) : nombre;
}

export function describirIssues(error: z.ZodError, prefijo = ''): string[] {
  return error.issues.map((i) => {
    const ruta = [prefijo, ...i.path.map(String)].filter(Boolean).join('.');
    return ruta ? `${ruta}: ${i.message}` : i.message;
  });
}

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

interface Ctx {
  archivo: string;
  problemas: ProblemaImport[];
}

function problema(ctx: Ctx, mensaje: string, donde?: string) {
  ctx.problemas.push({ archivo: ctx.archivo, donde, mensaje });
}

function normalizarCartas(raw: unknown[], ctx: Ctx, donde: string): CartaT[] {
  const cartas: CartaT[] = [];
  const vistos = new Set<string>();
  raw.forEach((c, i) => {
    const r = Carta.safeParse(c);
    const nombre = esObjeto(c) && typeof c.id === 'string' ? ` (${c.id})` : '';
    if (!r.success) {
      problema(ctx, describirIssues(r.error).join(' · '), `${donde} › carta ${i + 1}${nombre}`);
      return;
    }
    let carta = r.data;
    if (carta.frente.grafico) {
      const errores = erroresGrafico(carta.frente.grafico);
      if (errores.length) {
        problema(ctx, `${errores.join(' · ')} (se quitó el gráfico)`, `${donde} › carta ${i + 1}${nombre}`);
        const { grafico: _, ...frente } = carta.frente;
        carta = { ...carta, frente };
      }
    }
    if (vistos.has(carta.id)) {
      let n = 2;
      while (vistos.has(`${carta.id}-${n}`)) n++;
      problema(ctx, `id repetido "${carta.id}", se renombró a "${carta.id}-${n}"`, `${donde} › carta ${i + 1}`);
      carta = { ...carta, id: `${carta.id}-${n}` };
    }
    vistos.add(carta.id);
    cartas.push(carta);
  });
  return cartas;
}

/**
 * Convierte un objeto crudo (de un .json) en un nodo de la biblioteca.
 * Es tolerante: las cartas inválidas se descartan y se reportan, el resto se conserva.
 */
export function normalizarNodo(
  raw: unknown,
  ctx: Ctx,
  idPorDefecto: string,
  donde = '',
): { nodo: NodoLib; dentroDe?: string } | null {
  // Un archivo que es directamente una lista de cartas se toma como mazo.
  if (Array.isArray(raw) && !donde) raw = { cartas: raw };
  if (!esObjeto(raw)) {
    problema(ctx, 'se esperaba un objeto JSON { … }', donde || undefined);
    return null;
  }
  const crudo: Record<string, unknown> = { ...raw };
  if (crudo.id === undefined) crudo.id = typeof crudo.titulo === 'string' ? slug(crudo.titulo) : idPorDefecto;
  if (crudo.titulo === undefined) crudo.titulo = tituloDesdeNombre(idPorDefecto);

  const meta = MetaNodo.safeParse(crudo);
  if (!meta.success) {
    problema(ctx, describirIssues(meta.error).join(' · '), donde || undefined);
    return null;
  }
  const m = meta.data;
  const aqui = donde ? `${donde} › ${m.titulo}` : m.titulo;
  if (m.formato && m.formato !== FORMATO) {
    problema(ctx, `formato "${m.formato}" desconocido, se intentó leer como ${FORMATO}`, aqui);
  }
  const base = {
    id: m.id,
    titulo: m.titulo,
    ...(m.subtitulo ? { subtitulo: m.subtitulo } : {}),
    ...(m.sigla ? { sigla: m.sigla } : {}),
    ...(m.acento ? { acento: m.acento } : {}),
    ...(m.orden !== undefined ? { orden: m.orden } : {}),
  };

  const tieneHijos = Array.isArray(crudo.hijos);
  const tieneCartas = Array.isArray(crudo.cartas);
  if (tieneHijos && tieneCartas) {
    problema(ctx, 'un nodo tiene "hijos" o "cartas", no ambos; se usaron las cartas', aqui);
  }
  if (tieneCartas) {
    const cartas = normalizarCartas(crudo.cartas as unknown[], ctx, aqui);
    if (cartas.length === 0) {
      problema(ctx, 'el mazo no tiene ninguna carta válida, no se importó', aqui);
      return null;
    }
    const mazo: Mazo = { tipo: 'mazo', ...base, cartas };
    return { nodo: mazo, dentroDe: m.dentro_de };
  }
  if (tieneHijos) {
    const hijos: NodoLib[] = [];
    (crudo.hijos as unknown[]).forEach((h, i) => {
      const r = normalizarNodo(h, ctx, `${m.id}-${i + 1}`, aqui);
      if (r) hijos.push(r.nodo);
    });
    if (hijos.length === 0) {
      problema(ctx, 'la carpeta quedó vacía, no se importó', aqui);
      return null;
    }
    const carpeta: Carpeta = { tipo: 'carpeta', ...base, hijos: dedupe(hijos, ctx, aqui) };
    return { nodo: carpeta, dentroDe: m.dentro_de };
  }
  problema(ctx, 'falta "hijos" (subcarpetas) o "cartas" (mazo)', aqui);
  return null;
}

export function dedupe(nodos: NodoLib[], ctx: Ctx, donde: string): NodoLib[] {
  const vistos = new Set<string>();
  return nodos.map((n) => {
    if (!vistos.has(n.id)) {
      vistos.add(n.id);
      return n;
    }
    let k = 2;
    while (vistos.has(`${n.id}-${k}`)) k++;
    problema(ctx, `id repetido "${n.id}", se renombró a "${n.id}-${k}"`, donde);
    vistos.add(`${n.id}-${k}`);
    return { ...n, id: `${n.id}-${k}` };
  });
}

export function leerMetaCarpeta(raw: unknown, ctx: Ctx): MetaCarpetaT {
  const r = MetaCarpeta.safeParse(raw);
  if (!r.success) {
    problema(ctx, describirIssues(r.error).join(' · '));
    return {};
  }
  return r.data;
}
