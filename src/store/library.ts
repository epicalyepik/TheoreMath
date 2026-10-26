import { useSyncExternalStore } from 'react';
import { get, set } from 'idb-keyval';
import { bibliotecaVacia, type Biblioteca } from '../model/types';
import { importarEntradas } from '../import/files';
import { insertar } from '../import/merge';

const CLAVE = 'biblioteca-v1';

let estado: Biblioteca = bibliotecaVacia();
let cargada = false;
const oyentes = new Set<() => void>();

function emitir() {
  oyentes.forEach((f) => f());
}

export function getBiblioteca(): Biblioteca {
  return estado;
}

export async function guardar(nueva: Biblioteca): Promise<void> {
  estado = nueva;
  emitir();
  try {
    await set(CLAVE, nueva);
  } catch (e) {
    console.error('No se pudo guardar la biblioteca', e);
  }
}

export function actualizar(f: (b: Biblioteca) => Biblioteca): Promise<void> {
  return guardar(f(estado));
}

/** Carga los mazos de ejemplo que vienen con la app (carpeta /ejemplos del repo). */
export async function bibliotecaDeEjemplo(): Promise<Biblioteca> {
  const modulos = import.meta.glob('../../ejemplos/**/*.json', { query: '?raw', import: 'default' });
  const entradas = await Promise.all(
    Object.entries(modulos).map(async ([ruta, cargar]) => ({
      ruta: ruta.replace('../../ejemplos/', ''),
      datos: new TextEncoder().encode((await cargar()) as string),
    })),
  );
  const r = importarEntradas(entradas);
  if (r.problemas.length) console.warn('Problemas en los ejemplos', r.problemas);
  return insertar(bibliotecaVacia(), r.nodos, { tipo: 'ejemplo' });
}

export async function cargarBiblioteca(): Promise<void> {
  if (cargada) return;
  cargada = true;
  let guardada: Biblioteca | undefined;
  try {
    guardada = await get<Biblioteca>(CLAVE);
  } catch (e) {
    console.error('No se pudo leer la biblioteca', e);
  }
  if (guardada?.version === 1) {
    estado = guardada;
    emitir();
  } else {
    await guardar(await bibliotecaDeEjemplo());
  }
  // Pide al navegador que no borre los datos si falta espacio.
  navigator.storage?.persist?.().catch(() => {});
}

export function useBiblioteca(): Biblioteca {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => estado,
  );
}
