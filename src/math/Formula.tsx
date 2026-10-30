import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { avisar } from '../components/Toast';
import { Tex } from './Tex';

async function copiar(latex: string) {
  try {
    await navigator.clipboard.writeText(latex);
    avisar('LaTeX copiado');
  } catch {
    avisar('No se pudo copiar');
  }
}

// Por debajo de esta escala una fórmula se lee mal: conviene partirla en renglones.
const ESCALA_MINIMA_BLOQUE = 0.72;
const ESCALA_MINIMA = 0.5;
const redondear = (x: number) => Math.floor(x * 100) / 100;

/**
 * Fórmula que siempre entra en su caja:
 * - si sobra poco, se achica;
 * - si sobra mucho, se parte en renglones donde KaTeX lo permite (después de =, +, ⟺…)
 *   y, si un pedazo igual no entra, se achica lo justo.
 * Con una pulsación larga copia su LaTeX.
 */
export function Formula({ latex, className, enLinea = false }: { latex: string; className?: string; enLinea?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<'bloque' | 'partido'>('bloque');
  const [escala, setEscala] = useState(1);
  const anchoBloque = useRef(0);
  const pulsacion = useRef<{ t: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Las mediciones que lleguen tarde (fuentes, ResizeObserver) de un modo anterior se descartan.
    let vigente = true;
    const medir = () => {
      if (!vigente) return;
      const interior = el.firstElementChild as HTMLElement | null;
      const disponible = el.clientWidth;
      if (!interior || disponible <= 0) return;
      interior.style.fontSize = '';
      let nueva = 1;
      if (modo === 'bloque') {
        const natural = interior.offsetWidth;
        anchoBloque.current = natural;
        const ratio = disponible / natural;
        if (ratio < ESCALA_MINIMA_BLOQUE) {
          setModo('partido');
          return;
        }
        nueva = ratio < 1 ? redondear(ratio) : 1;
      } else {
        if (anchoBloque.current && disponible / anchoBloque.current >= ESCALA_MINIMA_BLOQUE) {
          setModo('bloque');
          return;
        }
        const pedazos = interior.querySelectorAll<HTMLElement>('.katex-base');
        const masAncho = Math.max(0, ...Array.from(pedazos, (p) => p.offsetWidth));
        nueva = masAncho > disponible ? Math.max(ESCALA_MINIMA, redondear(disponible / masAncho)) : 1;
      }
      interior.style.fontSize = `${nueva}em`;
      setEscala(nueva);
    };
    medir();
    // También al cambiar el contenido (p. ej. cuando terminan de cargar las fuentes de KaTeX).
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    document.fonts?.ready.then(medir);
    return () => {
      vigente = false;
      ro.disconnect();
    };
  }, [latex, modo]);

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

  const partido = modo === 'partido';
  return (
    <div
      ref={ref}
      className={`formula ${partido ? 'partida' : ''} ${enLinea ? 'en-linea' : ''} ${className ?? ''}`}
      onPointerDown={abajo}
      onPointerMove={mover}
      onPointerUp={cancelar}
      onPointerCancel={cancelar}
      onPointerLeave={cancelar}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="formula-interior" style={{ fontSize: `${escala}em` }}>
        {/* Partida, se dibuja en línea (que es donde KaTeX permite cortar) pero con el tamaño de bloque. */}
        <Tex latex={partido && !enLinea ? `\\displaystyle ${latex}` : latex} display={!partido && !enLinea} />
      </div>
    </div>
  );
}
