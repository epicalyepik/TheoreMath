import { useSyncExternalStore } from 'react';

let mensaje: { texto: string; id: number } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const oyentes = new Set<() => void>();
const emitir = () => oyentes.forEach((f) => f());

export function avisar(texto: string, ms = 2200) {
  mensaje = { texto, id: Date.now() };
  emitir();
  clearTimeout(timer);
  timer = setTimeout(() => {
    mensaje = null;
    emitir();
  }, ms);
}

export function Toast() {
  const m = useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => mensaje,
  );
  return (
    <div className="toast-zona" role="status" aria-live="polite">
      {m && (
        <div className="toast" key={m.id}>
          {m.texto}
        </div>
      )}
    </div>
  );
}
