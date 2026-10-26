import { useSyncExternalStore } from 'react';

// Chrome, Edge y Samsung Internet avisan con "beforeinstallprompt" que la app se puede instalar.
// Se guarda el evento para ofrecer un botón propio en la Ayuda (Safari no lo tiene: ahí se explican los pasos).

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let pendiente: EventoInstalar | null = null;
let instalada = false;
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((f) => f());

export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pendiente = e as EventoInstalar;
    emitir();
  });
  window.addEventListener('appinstalled', () => {
    pendiente = null;
    instalada = true;
    emitir();
  });
}

export const corriendoInstalada = () =>
  instalada || window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function instalar(): Promise<boolean> {
  if (!pendiente) return false;
  await pendiente.prompt();
  const { outcome } = await pendiente.userChoice;
  pendiente = null;
  emitir();
  return outcome === 'accepted';
}

let estado = { disponible: false, instalada: false };
export function useInstalacion() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => {
      const nuevo = { disponible: !!pendiente, instalada: corriendoInstalada() };
      if (nuevo.disponible !== estado.disponible || nuevo.instalada !== estado.instalada) estado = nuevo;
      return estado;
    },
  );
}
