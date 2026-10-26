import { useSyncExternalStore } from 'react';

// Preferencias chicas por dispositivo. localStorage puede fallar (modo privado),
// así que todo pasa por try/catch y la app funciona igual sin ellas.

export interface Prefs {
  practica: boolean;
  pistaVista: number;
  ultimoMazo?: string;
  posiciones: Record<string, number>;
}

const CLAVE = 'theoremath-prefs';
const defecto: Prefs = { practica: false, pistaVista: 0, posiciones: {} };

function leer(): Prefs {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? { ...defecto, ...JSON.parse(raw) } : defecto;
  } catch {
    return defecto;
  }
}

let prefs = leer();
const oyentes = new Set<() => void>();

export function setPrefs(f: (p: Prefs) => Prefs) {
  prefs = f(prefs);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(prefs));
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
  oyentes.forEach((o) => o());
}

export function resetPrefs() {
  setPrefs(() => defecto);
}

export function getPrefs() {
  return prefs;
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => prefs,
  );
}
