import { animate, motion, motionValue, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { CartaT } from '../model/schema';
import { CardBack, type Relacionada } from './CardBack';
import { CardFront } from './CardFront';

type Rol = 'prev' | 'top' | 'b1' | 'b2';

const RESORTE = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const;
const PROFUNDIDAD: Record<Rol, { scale: number; y: number; rotate: number; z: number }> = {
  prev: { scale: 1, y: 0, rotate: 0, z: 4 },
  top: { scale: 1, y: 0, rotate: 0, z: 3 },
  b1: { scale: 0.955, y: 14, rotate: -1.6, z: 2 },
  b2: { scale: 0.91, y: 27, rotate: 1.4, z: 1 },
};

export interface DeckHandle {
  siguiente: () => void;
  anterior: () => void;
  voltear: (v?: boolean) => void;
}

interface Props {
  cartas: CartaT[];
  /** Número visible de cada carta (su posición en el mazo original). */
  numeros: number[];
  indice: number;
  onIndice: (i: number) => void;
  acento: 'cian' | 'rosa';
  practica: boolean;
  pista: boolean;
  onVolteo: () => void;
  relacionadas: (c: CartaT) => Relacionada[];
  onIr: (id: string) => void;
  manejar?: (h: DeckHandle) => void;
}

const vibrar = () => {
  try {
    navigator.vibrate?.(6);
  } catch {
    /* sin vibración */
  }
};

function CartaEnPila({
  rol,
  x,
  rotX,
  off,
  children,
}: {
  rol: Rol;
  x: MotionValue<number>;
  rotX: MotionValue<number>;
  off: number;
  children: [React.ReactNode, React.ReactNode];
}) {
  const montada = useRef(false);
  const inclinacion = useTransform(x, [-off, 0, off], [-9, 0, 9]);
  useEffect(() => {
    const destino = rol === 'prev' ? -off : 0;
    if (!montada.current) {
      montada.current = true;
      x.jump(destino);
    } else if (x.get() !== destino) {
      animate(x, destino, RESORTE);
    }
  }, [rol, off, x]);
  const p = PROFUNDIDAD[rol];
  return (
    <motion.div
      className={`pila-slot rol-${rol}`}
      style={{ zIndex: p.z }}
      initial={false}
      animate={{ scale: p.scale, y: p.y, rotate: p.rotate }}
      transition={RESORTE}
      aria-hidden={rol !== 'top'}
      ref={(el: HTMLDivElement | null) => el?.toggleAttribute('inert', rol !== 'top')}
    >
      <motion.div className="pila-carta" style={{ x, rotate: inclinacion }}>
        <motion.div className="volteo" style={{ rotateX: rotX }}>
          <div className="cara cara-frente">{children[0]}</div>
          <div className="cara cara-dorso">{children[1]}</div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function DeckStack({ cartas, numeros, indice, onIndice, acento, practica, pista, onVolteo, relacionadas, onIr, manejar }: Props) {
  const pilaRef = useRef<HTMLDivElement>(null);
  const dorsoRef = useRef<HTMLDivElement>(null);
  const xs = useRef(new Map<string, MotionValue<number>>());
  const rot = useMotionValue(0);
  const cero = useMotionValue(0);
  const [volteada, setVolteada] = useState(false);
  const [tam, setTam] = useState({ w: 360, h: 600 });
  const off = tam.w * 1.18;

  useLayoutEffect(() => {
    const el = pilaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setTam({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const clave = (k: number) => `${k}:${cartas[k]?.id}`;
  const xDe = (k: number) => {
    const c = clave(k);
    let mv = xs.current.get(c);
    if (!mv) {
      mv = motionValue(0);
      xs.current.set(c, mv);
    }
    return mv;
  };

  // Al cambiar de carta, la nueva arranca mirando el frente.
  useEffect(() => {
    rot.jump(0);
    setVolteada(false);
    if (dorsoRef.current) dorsoRef.current.scrollTop = 0;
  }, [indice, rot]);

  const voltear = useCallback(
    (v?: boolean) => {
      const destino = v ?? !volteada;
      if (destino && !cartas[indice]?.dorso) return;
      setVolteada(destino);
      animate(rot, destino ? 180 : 0, RESORTE);
      if (destino) onVolteo();
    },
    [volteada, cartas, indice, rot, onVolteo],
  );

  const siguiente = useCallback(() => {
    if (indice >= cartas.length - 1) return;
    vibrar();
    animate(xDe(indice), -off, RESORTE);
    onIndice(indice + 1);
  }, [indice, cartas, off, onIndice]);

  const anterior = useCallback(() => {
    if (indice <= 0) return;
    vibrar();
    animate(xDe(indice - 1), 0, RESORTE);
    onIndice(indice - 1);
  }, [indice, cartas, onIndice]);

  useEffect(() => {
    manejar?.({ siguiente, anterior, voltear });
  }, [manejar, siguiente, anterior, voltear]);

  // ---- Gestos con el dedo / mouse ----
  const gesto = useRef<{
    id: number;
    x0: number;
    y0: number;
    eje: 'h' | 'v' | 'nada' | null;
    muestras: { x: number; y: number; t: number }[];
  } | null>(null);

  const onPointerDown = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, eje: null, muestras: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
  };

  const onPointerMove = (e: RPointerEvent) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    g.muestras.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (g.muestras.length > 6) g.muestras.shift();
    if (g.eje === null) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) g.eje = 'h';
      else if (Math.abs(dy) > 10) g.eje = volteada ? 'nada' : 'v';
      else return;
      if (g.eje !== 'nada') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (g.eje === 'h') {
      if (dx <= 0) {
        xDe(indice).set(indice < cartas.length - 1 ? dx : dx * 0.25);
        if (indice > 0) xDe(indice - 1).set(-off);
      } else if (indice > 0) {
        xDe(indice).set(0);
        xDe(indice - 1).set(-off + dx);
      } else {
        xDe(indice).set(dx * 0.25);
      }
    } else if (g.eje === 'v') {
      const ang = Math.max(0, Math.min(180, (-dy / (tam.h * 0.55)) * 180));
      if (cartas[indice]?.dorso) rot.set(ang);
    }
  };

  const terminar = (e: RPointerEvent, cancelado: boolean) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const m0 = g.muestras[0];
    const m1 = g.muestras[g.muestras.length - 1];
    const dt = Math.max(1, m1.t - m0.t);
    const vx = (m1.x - m0.x) / dt;
    const vy = (m1.y - m0.y) / dt;
    if (g.eje === 'h') {
      const umbral = tam.w * 0.26;
      if (!cancelado && (dx < -umbral || vx < -0.45) && indice < cartas.length - 1) siguiente();
      else if (!cancelado && (dx > umbral || vx > 0.45) && indice > 0) anterior();
      else {
        animate(xDe(indice), 0, RESORTE);
        if (indice > 0) animate(xDe(indice - 1), -off, RESORTE);
      }
    } else if (g.eje === 'v') {
      const abrir = !cancelado && (rot.get() > 70 || (vy < -0.5 && dy < -20));
      voltear(abrir && !!cartas[indice]?.dorso);
    }
  };

  // Tirar hacia abajo desde arriba del todo en el dorso = volver al frente.
  useEffect(() => {
    const el = dorsoRef.current;
    if (!el || !volteada) return;
    let y0 = 0;
    let x0 = 0;
    let tirando = false;
    let decidido = false;
    const inicio = (e: TouchEvent) => {
      y0 = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      tirando = false;
      decidido = false;
    };
    const mover = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - y0;
      const dx = e.touches[0].clientX - x0;
      if (!decidido && (Math.abs(dy) > 6 || Math.abs(dx) > 6)) {
        decidido = true;
        tirando = el.scrollTop <= 0 && dy > 0 && Math.abs(dy) > Math.abs(dx);
      }
      if (tirando) {
        e.preventDefault();
        rot.set(180 - Math.max(0, Math.min(180, (dy / (tam.h * 0.55)) * 180)));
      }
    };
    const fin = () => {
      if (!tirando) return;
      tirando = false;
      voltear(rot.get() > 110);
    };
    el.addEventListener('touchstart', inicio, { passive: true });
    el.addEventListener('touchmove', mover, { passive: false });
    el.addEventListener('touchend', fin);
    el.addEventListener('touchcancel', fin);
    return () => {
      el.removeEventListener('touchstart', inicio);
      el.removeEventListener('touchmove', mover);
      el.removeEventListener('touchend', fin);
      el.removeEventListener('touchcancel', fin);
    };
  }, [volteada, rot, tam.h, voltear]);

  // Rueda del mouse: abajo en el frente abre el dorso; arriba del todo en el dorso vuelve.
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (!volteada && e.deltaY > 30) voltear(true);
    else if (volteada && e.deltaY < -30 && (dorsoRef.current?.scrollTop ?? 0) <= 0) voltear(false);
  };

  const roles: [number, Rol][] = (
    [
      [indice - 1, 'prev'],
      [indice, 'top'],
      [indice + 1, 'b1'],
      [indice + 2, 'b2'],
    ] as [number, Rol][]
  ).filter(([k]) => k >= 0 && k < cartas.length);

  return (
    <div
      ref={pilaRef}
      className={`pila ${volteada ? 'volteada' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => terminar(e, false)}
      onPointerCancel={(e) => terminar(e, true)}
      onWheel={onWheel}
    >
      {roles.map(([k, rol]) => {
        const carta = cartas[k];
        const esTop = rol === 'top';
        return (
          <CartaEnPila key={clave(k)} rol={rol} x={xDe(k)} rotX={esTop ? rot : cero} off={off}>
            <CardFront
              carta={carta}
              numero={numeros[k]}
              acento={acento}
              practica={practica}
              pista={esTop && pista}
              onVoltear={() => voltear(true)}
            />
            {esTop || rol === 'prev' ? (
              <CardBack
                ref={esTop ? dorsoRef : undefined}
                carta={carta}
                acento={acento}
                relacionadas={relacionadas(carta)}
                onIr={onIr}
                onVolver={() => voltear(false)}
              />
            ) : null}
          </CartaEnPila>
        );
      })}
    </div>
  );
}
