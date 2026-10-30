import { memo, useMemo, type ReactNode } from 'react';
import { Formula } from './Formula';
import { Tex, partirTexto } from './Tex';

// **negrita** dentro del texto plano (lo único de Markdown que se admite).
function conNegritas(s: string, k: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={`${k}-${j}`}>{p.slice(2, -2)}</strong> : p,
  );
}

/** Texto en prosa con matemática embebida. Los bloques $$…$$ se ajustan al ancho como cualquier fórmula. */
export const Prosa = memo(function Prosa({ texto, className }: { texto: string; className?: string }) {
  const trozos = useMemo(() => partirTexto(texto), [texto]);
  return (
    <span className={`prosa ${className ?? ''}`}>
      {trozos.map((t, i) =>
        t.tipo === 'texto' ? conNegritas(t.v, String(i)) : t.display ? <Formula key={i} latex={t.v} className="en-prosa" /> : <Tex key={i} latex={t.v} />,
      )}
    </span>
  );
});
