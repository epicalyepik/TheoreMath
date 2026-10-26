import katex from 'katex';
import { memo, useMemo, type ReactNode } from 'react';

function renderizar(latex: string, display: boolean): string {
  return katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    trust: false,
    strict: 'ignore',
    output: 'htmlAndMathml',
    maxExpand: 500,
  });
}

/** Una expresión LaTeX pura (sin $). */
export const Tex = memo(function Tex({ latex, display = false, className }: { latex: string; display?: boolean; className?: string }) {
  const html = useMemo(() => renderizar(latex, display), [latex, display]);
  return <span className={`tex ${display ? 'tex-bloque' : ''} ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;
});

export type Trozo = { tipo: 'texto'; v: string } | { tipo: 'math'; v: string; display: boolean };

/** Parte un texto con $…$ (en línea) y $$…$$ (bloque). "\$" es un signo pesos literal. */
export function partirTexto(s: string): Trozo[] {
  const out: Trozo[] = [];
  let buf = '';
  let i = 0;
  const volcar = () => {
    if (buf) out.push({ tipo: 'texto', v: buf });
    buf = '';
  };
  while (i < s.length) {
    if (s[i] === '\\' && s[i + 1] === '$') {
      buf += '$';
      i += 2;
      continue;
    }
    if (s[i] === '$') {
      const display = s[i + 1] === '$';
      const delim = display ? '$$' : '$';
      const inicio = i + delim.length;
      let fin = inicio;
      while (fin < s.length) {
        if (s[fin] === '\\') {
          fin += 2;
          continue;
        }
        if (s.startsWith(delim, fin)) break;
        fin++;
      }
      if (fin < s.length && fin > inicio) {
        volcar();
        out.push({ tipo: 'math', v: s.slice(inicio, fin), display });
        i = fin + delim.length;
        continue;
      }
    }
    buf += s[i];
    i++;
  }
  volcar();
  return out;
}

// **negrita** dentro del texto plano (lo único de Markdown que se admite).
function conNegritas(s: string, k: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
    p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={`${k}-${j}`}>{p.slice(2, -2)}</strong> : p,
  );
}

/** Texto en prosa con matemática embebida. Respeta los saltos de línea. */
export const Prosa = memo(function Prosa({ texto, className }: { texto: string; className?: string }) {
  const trozos = useMemo(() => partirTexto(texto), [texto]);
  return (
    <span className={`prosa ${className ?? ''}`}>
      {trozos.map((t, i) => (t.tipo === 'texto' ? conNegritas(t.v, String(i)) : <Tex key={i} latex={t.v} display={t.display} />))}
    </span>
  );
});
