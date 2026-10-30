import { memo, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ElementoGraficoT, GraficoT } from '../model/schema';
import { compilar } from './expr';
import { Prosa } from './Prosa';

const MUESTRAS = 320;

const COLORES = { cian: 'var(--cian)', rosa: 'var(--rosa)', tenue: 'var(--tenue)', claro: 'var(--texto)' } as const;
type ColorN = keyof typeof COLORES;
const col = (c: ColorN | undefined, defecto: ColorN) => COLORES[c ?? defecto];

interface Etiqueta {
  x: number;
  y: number;
  texto: string;
  color: string;
  ancla: 'en-punto' | 'libre';
}

function pasoLindo(rango: number): number {
  const bruto = rango / 8;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / mag;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
}

export const Plot = memo(function Plot({ grafico, className }: { grafico: GraficoT; className?: string }) {
  const uid = useId().replace(/:/g, '');
  const ref = useRef<HTMLElement>(null);
  // Se dibuja al tamaño real en píxeles: así no se deforma y las etiquetas caen justo.
  const [tam, setTam] = useState({ w: 320, h: 200 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const w = Math.round(el.clientWidth);
      const h = Math.round(el.clientHeight);
      if (w > 0 && h > 0) setTam((t) => (t.w === w && t.h === h ? t : { w, h }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const { w: W, h: H } = tam;
  const contenido = useMemo(() => dibujar(grafico, uid, W, H), [grafico, uid, W, H]);
  return (
    <figure ref={ref} className={`plot ${className ?? ''}`} aria-label="Gráfico">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-hidden="true">
        {contenido.svg}
      </svg>
      {contenido.etiquetas.map((e, i) => (
        <span
          key={i}
          className={`plot-etiqueta ${e.ancla}`}
          style={{ left: `${(e.x / W) * 100}%`, top: `${(e.y / H) * 100}%`, color: e.color }}
        >
          <Prosa texto={e.texto} />
        </span>
      ))}
      {contenido.error && <figcaption className="plot-error">{contenido.error}</figcaption>}
    </figure>
  );
});

function dibujar(g: GraficoT, uid: string, W: number, H: number): { svg: ReactNode; etiquetas: Etiqueta[]; error?: string } {
  const [x0, x1] = g.x;
  const [y0, y1] = g.y;
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * W;
  const sy = (y: number) => H - ((y - y0) / (y1 - y0)) * H;
  const etiquetas: Etiqueta[] = [];
  const nodos: ReactNode[] = [];
  let error: string | undefined;

  // Cuadrícula y ejes
  const px = pasoLindo(x1 - x0);
  const py = pasoLindo(y1 - y0);
  if (g.cuadricula) {
    for (let x = Math.ceil(x0 / px) * px; x <= x1; x += px) nodos.push(<line key={`gx${x}`} className="plot-grilla" x1={sx(x)} x2={sx(x)} y1={0} y2={H} />);
    for (let y = Math.ceil(y0 / py) * py; y <= y1; y += py) nodos.push(<line key={`gy${y}`} className="plot-grilla" x1={0} x2={W} y1={sy(y)} y2={sy(y)} />);
  }
  if (g.ejes !== false) {
    const ejeY = y0 <= 0 && y1 >= 0 ? sy(0) : H - 0.5;
    const ejeX = x0 <= 0 && x1 >= 0 ? sx(0) : 0.5;
    nodos.push(<line key="ex" className="plot-eje" x1={0} x2={W} y1={ejeY} y2={ejeY} markerEnd={`url(#fl-eje-${uid})`} />);
    nodos.push(<line key="ey" className="plot-eje" x1={ejeX} x2={ejeX} y1={H} y2={0} markerEnd={`url(#fl-eje-${uid})`} />);
    for (let x = Math.ceil(x0 / px) * px; x < x1; x += px) {
      if (Math.abs(x) > px / 2) nodos.push(<line key={`tx${x}`} className="plot-eje" x1={sx(x)} x2={sx(x)} y1={ejeY - 2.5} y2={ejeY + 2.5} />);
    }
    for (let y = Math.ceil(y0 / py) * py; y < y1; y += py) {
      if (Math.abs(y) > py / 2) nodos.push(<line key={`ty${y}`} className="plot-eje" x1={ejeX - 2.5} x2={ejeX + 2.5} y1={sy(y)} y2={sy(y)} />);
    }
    const [ex, ey] = g.etiquetas_ejes ?? ['x', 'y'];
    if (ex) etiquetas.push({ x: W - 8, y: ejeY + 10, texto: ex, color: 'var(--tenue)', ancla: 'libre' });
    if (ey) etiquetas.push({ x: ejeX + 10, y: 8, texto: ey, color: 'var(--tenue)', ancla: 'libre' });
  }

  const muestrear = (expr: string, desde: number, hasta: number): [number, number][][] => {
    const f = compilar(expr, ['x']);
    const tramos: [number, number][][] = [];
    let actual: [number, number][] = [];
    const margen = (y1 - y0) * 4;
    for (let i = 0; i <= MUESTRAS; i++) {
      const x = desde + ((hasta - desde) * i) / MUESTRAS;
      const y = f({ x });
      const valido = Number.isFinite(y) && y > y0 - margen && y < y1 + margen;
      const prev = actual[actual.length - 1];
      const salto = prev && Math.abs(y - prev[1]) > (y1 - y0) * 1.5;
      if (!valido || salto) {
        if (actual.length > 1) tramos.push(actual);
        actual = valido ? [[x, y]] : [];
      } else {
        actual.push([x, y]);
      }
    }
    if (actual.length > 1) tramos.push(actual);
    return tramos;
  };
  const camino = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join('');

  g.elementos.forEach((el: ElementoGraficoT, i) => {
    try {
      switch (el.tipo) {
        case 'region': {
          const [a, b] = el.dominio;
          const sup = compilar(el.superior, ['x']);
          const inf = el.inferior ? compilar(el.inferior, ['x']) : () => 0;
          const arriba: [number, number][] = [];
          const abajo: [number, number][] = [];
          for (let k = 0; k <= MUESTRAS / 2; k++) {
            const x = a + ((b - a) * k) / (MUESTRAS / 2);
            arriba.push([x, sup({ x })]);
            abajo.push([x, inf({ x })]);
          }
          const pts = [...arriba, ...abajo.reverse()].filter(([, y]) => Number.isFinite(y));
          nodos.push(<path key={i} d={camino(pts) + 'Z'} fill={col(el.color, 'cian')} className="plot-region" />);
          if (el.etiqueta) etiquetas.push({ x: sx((a + b) / 2), y: sy((sup({ x: (a + b) / 2 }) + inf({ x: (a + b) / 2 })) / 2), texto: el.etiqueta, color: col(el.color, 'cian'), ancla: 'libre' });
          break;
        }
        case 'funcion': {
          const [a, b] = el.dominio ?? [x0, x1];
          const tramos = muestrear(el.expr, Math.max(a, x0 - (x1 - x0)), Math.min(b, x1 + (x1 - x0)));
          tramos.forEach((t, k) =>
            nodos.push(<path key={`${i}-${k}`} d={camino(t)} stroke={col(el.color, 'cian')} className={`plot-curva ${el.discontinua ? 'discontinua' : ''}`} />),
          );
          if (el.etiqueta && tramos.length) {
            const ult = tramos[tramos.length - 1];
            const [lx, ly] = ult[Math.floor(ult.length * 0.85)];
            etiquetas.push({ x: sx(lx), y: sy(ly) - 12, texto: el.etiqueta, color: col(el.color, 'cian'), ancla: 'libre' });
          }
          break;
        }
        case 'parametrica': {
          const fx = compilar(el.x, ['t']);
          const fy = compilar(el.y, ['t']);
          const pts: [number, number][] = [];
          for (let k = 0; k <= MUESTRAS; k++) {
            const t = el.t[0] + ((el.t[1] - el.t[0]) * k) / MUESTRAS;
            pts.push([fx({ t }), fy({ t })]);
          }
          nodos.push(<path key={i} d={camino(pts.filter((p) => p.every(Number.isFinite)))} stroke={col(el.color, 'cian')} className={`plot-curva ${el.discontinua ? 'discontinua' : ''}`} />);
          if (el.etiqueta) etiquetas.push({ x: sx(pts[Math.floor(pts.length / 8)][0]) + 8, y: sy(pts[Math.floor(pts.length / 8)][1]) - 10, texto: el.etiqueta, color: col(el.color, 'cian'), ancla: 'libre' });
          break;
        }
        case 'punto':
          nodos.push(
            <circle key={i} cx={sx(el.x)} cy={sy(el.y)} r={3.6} className={`plot-punto ${el.hueco ? 'hueco' : ''}`} stroke={col(el.color, 'rosa')} fill={el.hueco ? 'var(--carta-fondo)' : col(el.color, 'rosa')} />,
          );
          if (el.etiqueta) etiquetas.push({ x: sx(el.x), y: sy(el.y), texto: el.etiqueta, color: col(el.color, 'rosa'), ancla: 'en-punto' });
          break;
        case 'segmento':
          nodos.push(<line key={i} x1={sx(el.desde[0])} y1={sy(el.desde[1])} x2={sx(el.hasta[0])} y2={sy(el.hasta[1])} stroke={col(el.color, 'tenue')} className={`plot-linea ${el.discontinua ? 'discontinua' : ''}`} />);
          if (el.etiqueta) etiquetas.push({ x: sx((el.desde[0] + el.hasta[0]) / 2), y: sy((el.desde[1] + el.hasta[1]) / 2) - 10, texto: el.etiqueta, color: col(el.color, 'tenue'), ancla: 'libre' });
          break;
        case 'vector': {
          const d = el.desde ?? [0, 0];
          const c = el.color ?? 'rosa';
          nodos.push(<line key={i} x1={sx(d[0])} y1={sy(d[1])} x2={sx(el.hasta[0])} y2={sy(el.hasta[1])} stroke={COLORES[c]} className="plot-vector" markerEnd={`url(#fl-${c}-${uid})`} />);
          if (el.etiqueta) etiquetas.push({ x: sx((d[0] + el.hasta[0]) / 2) - 10, y: sy((d[1] + el.hasta[1]) / 2) - 10, texto: el.etiqueta, color: COLORES[c], ancla: 'libre' });
          break;
        }
        case 'recta_v':
          nodos.push(<line key={i} x1={sx(el.x)} x2={sx(el.x)} y1={0} y2={H} stroke={col(el.color, 'tenue')} className="plot-linea discontinua" />);
          if (el.etiqueta) etiquetas.push({ x: sx(el.x), y: H - 10, texto: el.etiqueta, color: col(el.color, 'tenue'), ancla: 'libre' });
          break;
        case 'recta_h':
          nodos.push(<line key={i} y1={sy(el.y)} y2={sy(el.y)} x1={0} x2={W} stroke={col(el.color, 'tenue')} className="plot-linea discontinua" />);
          if (el.etiqueta) etiquetas.push({ x: 14, y: sy(el.y) - 10, texto: el.etiqueta, color: col(el.color, 'tenue'), ancla: 'libre' });
          break;
        case 'poligonal': {
          const d = camino(el.puntos as [number, number][]) + (el.cerrada ? 'Z' : '');
          nodos.push(<path key={i} d={d} stroke={col(el.color, 'cian')} className={`plot-curva ${el.discontinua ? 'discontinua' : ''} ${el.cerrada ? 'cerrada' : ''}`} />);
          break;
        }
        case 'texto':
          etiquetas.push({ x: sx(el.x), y: sy(el.y), texto: el.texto, color: col(el.color, 'claro'), ancla: 'libre' });
          break;
      }
    } catch (e) {
      error = `Gráfico: ${(e as Error).message}`;
    }
  });

  const svg = (
    <>
      <defs>
        <clipPath id={`clip-${uid}`}>
          <rect x={0} y={0} width={W} height={H} />
        </clipPath>
        <marker id={`fl-eje-${uid}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9" fill="none" stroke="var(--tenue)" strokeWidth="1.4" />
        </marker>
        {(Object.keys(COLORES) as ColorN[]).map((c) => (
          <marker key={c} id={`fl-${c}-${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 Z" fill={COLORES[c]} />
          </marker>
        ))}
      </defs>
      <g clipPath={`url(#clip-${uid})`}>{nodos}</g>
    </>
  );
  return { svg, etiquetas, error };
}
