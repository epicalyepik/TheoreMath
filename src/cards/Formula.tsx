import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Tex } from '../math/Tex';
import { avisar } from '../components/Toast';

async function copiar(latex: string) {
  try {
    await navigator.clipboard.writeText(latex);
    avisar('LaTeX copiado');
  } catch {
    avisar('No se pudo copiar');
  }
}

/**
 * Fórmula en bloque que se achica sola si no entra a lo ancho,
 * y copia su LaTeX con una pulsación larga.
 */
export function Formula({ latex, className }: { latex: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);
  const escalaRef = useRef(1);
  escalaRef.current = escala;
  const pulsacion = useRef<{ t: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const interior = el.firstElementChild as HTMLElement | null;
      if (!interior) return;
      interior.style.fontSize = '';
      const disponible = el.clientWidth;
      const necesario = interior.offsetWidth;
      interior.style.fontSize = `${escalaRef.current}em`;
      const nueva = necesario > disponible && disponible > 0 ? Math.max(0.55, Math.floor((disponible / necesario) * 100) / 100) : 1;
      escalaRef.current = nueva;
      interior.style.fontSize = `${nueva}em`;
      setEscala(nueva);
    };
    medir();
    // También al cambiar el contenido (p. ej. cuando terminan de cargar las fuentes de KaTeX).
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    document.fonts?.ready.then(medir);
    return () => ro.disconnect();
  }, [latex]);

  const cancelar = () => {
    if (pulsacion.current) clearTimeout(pulsacion.current.t);
    pulsacion.current = null;
  };
  const abajo = (e: PointerEvent) => {
    cancelar();
    pulsacion.current = { t: setTimeout(() => copiar(latex), 550), x: e.clientX, y: e.clientY };
  };
  const mover = (e: PointerEvent) => {
    const p = pulsacion.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelar();
  };

  return (
    <div
      ref={ref}
      className={`formula ${className ?? ''}`}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={cancelar}
      onPointerCancel={cancelar}
      onPointerLeave={cancelar}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="formula-interior" style={{ fontSize: `${escala}em` }}>
        <Tex latex={latex} display />
      </div>
    </div>
  );
}
