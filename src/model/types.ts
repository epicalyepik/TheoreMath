import type { CartaT } from './schema';

export type Fuente = { tipo: 'url'; url: string; importado: number } | { tipo: 'archivo'; nombre: string; importado: number } | { tipo: 'ejemplo' };

interface NodoBase {
  id: string;
  titulo: string;
  subtitulo?: string;
  sigla?: string;
  acento?: 'cian' | 'rosa';
  orden?: number;
  fuente?: Fuente;
}

export interface Mazo extends NodoBase {
  tipo: 'mazo';
  cartas: CartaT[];
}

export interface Carpeta extends NodoBase {
  tipo: 'carpeta';
  hijos: NodoLib[];
}

export type NodoLib = Mazo | Carpeta;

export interface Biblioteca {
  version: 1;
  raices: NodoLib[];
}

export const bibliotecaVacia = (): Biblioteca => ({ version: 1, raices: [] });

// Un nodo importado y la ruta (ids) de la carpeta donde debe ubicarse.
export interface Ubicado {
  ruta: string[];
  nodo: NodoLib;
}

export interface ProblemaImport {
  archivo: string;
  donde?: string;
  mensaje: string;
}

export interface ResultadoImport {
  nodos: Ubicado[];
  problemas: ProblemaImport[];
  cartas: number;
  mazos: number;
}
