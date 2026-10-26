import type { ReactNode } from 'react';

// Esquina ornamental: filete curvo doble con un rombo en el vértice.
function Esquina({ className }: { className: string }) {
  return (
    <svg className={`esquina ${className}`} viewBox="0 0 34 34" aria-hidden="true">
      <path d="M1.5 33 V14 Q1.5 1.5 14 1.5 H33" />
      <path d="M6 33 V16 Q6 6 16 6 H33" className="fina" />
      <path d="M11 11.5 l3.2 -3.2 l3.2 3.2 l-3.2 3.2 z" className="rombo" />
      <path d="M21 1.5 v3 M1.5 21 h3" className="fina" />
    </svg>
  );
}

// Regla de precisión: marcas finas como en un instrumento de medición.
export function Regla({ marcas = 9 }: { marcas?: number }) {
  return (
    <div className="regla" aria-hidden="true">
      {Array.from({ length: marcas }, (_, i) => (
        <span key={i} className={i === Math.floor(marcas / 2) ? 'alta' : i % 2 ? '' : 'media'} />
      ))}
    </div>
  );
}

export function CardFrame({ children, className, acento = 'cian' }: { children: ReactNode; className?: string; acento?: 'cian' | 'rosa' }) {
  return (
    <div className={`carta ${className ?? ''}`} data-acento={acento}>
      <div className="carta-marco" aria-hidden="true">
        <Esquina className="ai" />
        <Esquina className="ad" />
        <Esquina className="bi" />
        <Esquina className="bd" />
      </div>
      {children}
    </div>
  );
}
