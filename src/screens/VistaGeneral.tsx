import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Formula } from '../cards/Formula';
import { Glifo, TIPOS, dosDigitos } from '../cards/tipos';
import { IconoBuscar, IconoCerrar } from '../components/Iconos';
import { Prosa } from '../math/Tex';
import type { CartaT } from '../model/schema';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  acento: 'cian' | 'rosa';
  cartas: CartaT[];
  numeros: number[];
  indice: number;
  onElegir: (i: number) => void;
}

/** La expresión que mejor resume la carta: la tesis, la fórmula o lo primero que tenga. */
function resumen(c: CartaT): { latex?: string; texto?: string } {
  const f = c.frente;
  const latex = f.tesis ?? f.formula ?? f.variantes?.[0]?.latex ?? f.axiomas?.[0] ?? f.hipotesis?.[0];
  if (latex) return { latex };
  return { texto: f.definicion ?? f.pasos?.[0] ?? c.subtitulo };
}

const plano = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Vista general del mazo: todas las cartas en miniatura, flotando sobre la mesa,
 * con su título y la expresión principal. Tocar una lleva a esa carta.
 */
export function VistaGeneral({ abierta, onCerrar, titulo, acento, cartas, numeros, indice, onElegir }: Props) {
  const [filtro, setFiltro] = useState('');
  const actualRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierta) return setFiltro('');
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    // La carta actual queda a la vista al abrir.
    requestAnimationFrame(() => actualRef.current?.scrollIntoView({ block: 'center' }));
    return () => window.removeEventListener('keydown', tecla);
  }, [abierta, onCerrar]);

  const visibles = useMemo(() => {
    const q = plano(filtro.trim());
    return cartas
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => !q || plano(`${c.titulo} ${c.subtitulo ?? ''} ${(c.etiquetas ?? []).join(' ')} ${TIPOS[c.tipo].nombre}`).includes(q));
  }, [cartas, filtro]);

  return createPortal(
    <AnimatePresence>
      {abierta && (
        <motion.div
          className="vista-general"
          data-acento={acento}
          role="dialog"
          aria-modal="true"
          aria-label={`Vista general: ${titulo}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <header className="vg-cabeza">
            <div className="vg-titulo">
              <span className="kicker">Vista general · {cartas.length} cartas</span>
              <h2>{titulo}</h2>
            </div>
            <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar vista general">
              <IconoCerrar />
            </button>
          </header>
          <label className="buscador vg-buscador">
            <IconoBuscar />
            <input type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar este mazo…" autoComplete="off" />
          </label>

          <ol className="vg-grilla">
            {visibles.map(({ c, i }, orden) => {
              const r = resumen(c);
              return (
                <motion.li
                  key={`${i}-${c.id}`}
                  initial={{ opacity: 0, y: 24, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28, delay: Math.min(orden, 18) * 0.025 }}
                >
                  <button
                    ref={i === indice ? actualRef : undefined}
                    type="button"
                    className={`vg-carta ${i === indice ? 'actual' : ''}`}
                    // Cada carta flota con su propio ritmo, como sobre agua.
                    style={{ animationDelay: `${-((i * 0.83) % 6)}s`, animationDuration: `${6 + ((i * 1.7) % 3)}s` }}
                    onClick={() => onElegir(i)}
                  >
                    <span className="vg-cabecita">
                      <b>{dosDigitos(numeros[i])}</b>
                      <span className="vg-tipo">
                        <Glifo tipo={c.tipo} /> {TIPOS[c.tipo].nombre}
                      </span>
                    </span>
                    <span className="vg-nombre">{c.titulo}</span>
                    <span className="vg-resumen">
                      {r.latex ? <Formula latex={r.latex} /> : r.texto ? <Prosa texto={r.texto} /> : null}
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ol>
          {visibles.length === 0 && <p className="sin-resultados">Ninguna carta coincide con “{filtro}”.</p>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
