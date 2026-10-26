import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { IconoCerrar } from './Iconos';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  className?: string;
}

/** Hoja inferior modal. Se cierra con Escape, tocando afuera o arrastrando hacia abajo. */
export function Sheet({ abierta, onCerrar, titulo, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const arrastre = useDragControls();

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    const anterior = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      window.removeEventListener('keydown', tecla);
      anterior?.focus?.();
    };
  }, [abierta, onCerrar]);

  return (
    <AnimatePresence>
      {abierta && (
        <div className="sheet-capa">
          <motion.div className="sheet-fondo" onClick={onCerrar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={ref}
            className={`sheet ${className ?? ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            dragListener={false}
            dragControls={arrastre}
            onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 500) && onCerrar()}
          >
            <header className="sheet-cabeza" onPointerDown={(e) => arrastre.start(e)}>
              <span className="sheet-asa" aria-hidden="true" />
              <h2>{titulo}</h2>
              <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
                <IconoCerrar />
              </button>
            </header>
            <div className="sheet-cuerpo">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
