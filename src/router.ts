import { useSyncExternalStore } from 'react';

// Rutas por hash (funcionan en cualquier hosting estático sin configurar el servidor):
//   #/cuadernos/<id>/<id>…        carpeta abierta en el explorador
//   #/mazo/<id>/<id>…?carta=<id>  mazo abierto (opcionalmente en una carta)
//   #/importar?url=<link>         abre la importación con un link precargado
//   #/ayuda/<seccion>             ayuda, opcionalmente en una sección

export type Pantalla = 'cuadernos' | 'mazo' | 'importar' | 'ayuda';

export interface Ruta {
  pantalla: Pantalla;
  ruta: string[];
  params: URLSearchParams;
}

function leer(): Ruta {
  const hash = location.hash.replace(/^#\/?/, '');
  const [camino, query = ''] = hash.split('?');
  const partes = camino.split('/').filter(Boolean).map(decodeURIComponent);
  const p = partes[0];
  const pantalla: Pantalla = p === 'mazo' || p === 'importar' || p === 'ayuda' ? p : 'cuadernos';
  return { pantalla, ruta: partes.slice(1), params: new URLSearchParams(query) };
}

let actual = leer();
let clave = location.hash;

function suscribir(f: () => void) {
  const h = () => {
    if (location.hash !== clave) {
      clave = location.hash;
      actual = leer();
    }
    f();
  };
  window.addEventListener('hashchange', h);
  return () => window.removeEventListener('hashchange', h);
}

export function useRuta(): Ruta {
  return useSyncExternalStore(suscribir, () => actual);
}

export function enlace(pantalla: Pantalla, ruta: string[] = [], params?: Record<string, string>): string {
  const q = params ? new URLSearchParams(params).toString() : '';
  return `#/${pantalla}${ruta.map((r) => '/' + encodeURIComponent(r)).join('')}${q ? '?' + q : ''}`;
}

export function navegar(pantalla: Pantalla, ruta: string[] = [], params?: Record<string, string>, reemplazar = false) {
  const destino = enlace(pantalla, ruta, params);
  if (reemplazar) {
    history.replaceState(null, '', destino);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    location.hash = destino;
  }
}
