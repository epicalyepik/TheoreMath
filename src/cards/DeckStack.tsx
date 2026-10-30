import { animate, motion, motionValue, useMotionValue, useTransform, type MotionValue } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import type { CartaT } from '../model/schema';
import { CardBack, type Relacionada } from './CardBack';
import { CardFront } from './CardFront';

const RESORTE = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 } as const;

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

// En PC y tablet las cartas se apoyan en fila sobre la mesa; en el celular, en una pila.
const CONSULTA_MESA = '(min-width: 720px) and (min-height: 520px)';
function useModoMesa(): boolean {
  return useSyncExternalStore(
    (f) => {
      const mq = window.matchMedia(CONSULTA_MESA);
      mq.addEventListener('change', f);
      return () => mq.removeEventListener('change', f);
    },
    () => window.matchMedia(CONSULTA_MESA).matches,
  );
}

/** Una carta con sus dos caras, que gira sobre el eje horizontal. */
function Volteable({ rotX, frente, dorso, inerte }: { rotX: MotionValue<number>; frente: ReactNode; dorso: ReactNode; inerte: boolean }) {
  return (
    <motion.div className="volteo" style={{ rotateX: rotX }} ref={(el: HTMLDivElement | null) => el?.toggleAttribute('inert', inerte)}>
      <div className="cara cara-frente">{frente}</div>
      <div className="cara cara-dorso">{dorso}</div>
    </motion.div>
  );
}

// ---------- Celular: pila ----------

type Rol = 'prev' | 'top' | 'b1' | 'b2';
const PROFUNDIDAD: Record<Rol, { scale: number; y: number; rotate: number; z: number }> = {
  prev: { scale: 1, y: 0, rotate: 0, z: 4 },
  top: { scale: 1, y: 0, rotate: 0, z: 3 },
  b1: { scale: 0.955, y: 14, rotate: -1.6, z: 2 },
  b2: { scale: 0.91, y: 27, rotate: 1.4, z: 1 },
};

function CartaEnPila({ rol, x, off, children }: { rol: Rol; x: MotionValue<number>; off: number; children: ReactNode }) {
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
    >
      <motion.div className="pila-carta" style={{ x, rotate: inclinacion }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ---------- PC / tablet: mesa ----------

function CartaEnMesa({
  k,
  pos,
  paso,
  ancho,
  alto,
  actual,
  onElegir,
  etiqueta,
  children,
}: {
  k: number;
  pos: MotionValue<number>;
  paso: number;
  ancho: number;
  alto: number;
  actual: boolean;
  onElegir: () => void;
  etiqueta: string;
  children: ReactNode;
}) {
  const d = useTransform(pos, (p) => k - p);
  const x = useTransform(d, (v) => v * paso);
  const scale = useTransform(d, (v) => 1 - 0.18 * Math.min(Math.abs(v), 1.4));
  const brillo = useTransform(d, (v) => `brightness(${1 - 0.42 * Math.min(Math.abs(v), 1.5)})`);
  const zIndex = useTransform(d, (v) => 100 - Math.round(Math.abs(v) * 10));
  return (
    <motion.div className={`mesa-slot ${actual ? 'actual' : ''}`} style={{ x, scale, zIndex, width: ancho, height: alto, marginLeft: -ancho / 2, marginTop: -alto / 2 }} aria-hidden={!actual}>
      <motion.div className="pila-carta" style={{ filter: brillo }}>
        {children}
      </motion.div>
      {!actual && <button type="button" className="mesa-tapa" onClick={onElegir} aria-label={etiqueta} tabIndex={-1} />}
    </motion.div>
  );
}

// ---------- Gestos de borde ----------

const desborda = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 2;
const enElFondo = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

/**
 * En una cara con scroll nativo, pasarse del borde da vuelta la carta:
 * - 'abajo': en el dorso, arriba del todo y tirando hacia abajo, vuelve al frente;
 * - 'arriba': en un frente que no entra, abajo del todo y deslizando hacia arriba, muestra el dorso.
 * La decisión se toma al empezar el gesto, así un scroll normal nunca termina volteando la carta.
 */
function useTirarParaVoltear(
  obtener: () => HTMLElement | null,
  activo: boolean,
  sentido: 'abajo' | 'arriba',
  rot: MotionValue<number>,
  alto: number,
  voltear: (v?: boolean) => void,
  indice: number,
) {
  useEffect(() => {
    const el = obtener();
    if (!el || !activo) return;
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
        const vertical = Math.abs(dy) > Math.abs(dx);
        tirando =
          vertical && (sentido === 'abajo' ? el.scrollTop <= 0 && dy > 0 : desborda(el) && enElFondo(el) && dy < 0);
      }
      if (!tirando) return;
      e.preventDefault();
      const ang = Math.max(0, Math.min(180, (Math.abs(dy) / (alto * 0.55)) * 180));
      rot.set(sentido === 'abajo' ? 180 - ang : ang);
    };
    const fin = () => {
      if (!tirando) return;
      tirando = false;
      voltear(sentido === 'abajo' ? rot.get() > 110 : rot.get() > 70);
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
    // `obtener` lee el DOM de la carta actual: se vuelve a enganchar cuando cambia la carta (indice).
  }, [activo, sentido, rot, alto, voltear, indice]);
}

// ---------- Mazo ----------

export function DeckStack({ cartas, numeros, indice, onIndice, acento, practica, pista, onVolteo, relacionadas, onIr, manejar }: Props) {
  const mesa = useModoMesa();
  const pilaRef = useRef<HTMLDivElement>(null);
  const dorsoRef = useRef<HTMLDivElement>(null);
  const xs = useRef(new Map<string, MotionValue<number>>());
  const pos = useMotionValue(indice);
  const rot = useMotionValue(0);
  const cero = useMotionValue(0);
  const [volteada, setVolteada] = useState(false);
  const [tam, setTam] = useState({ w: 360, h: 600 });
  const off = tam.w * 1.18;

  // Medidas de la carta en la mesa: más chica que en el celular, para que entren varias.
  const altoMesa = Math.min(tam.h, 760);
  const anchoMesa = Math.min(altoMesa * 0.56, 420, tam.w * 0.5);
  const altoCartaMesa = Math.min(altoMesa, anchoMesa / 0.56);
  const paso = anchoMesa * 0.84;
  const radio = Math.min(4, Math.ceil(tam.w / 2 / paso) + 1);
  const altoGiro = mesa ? altoCartaMesa : tam.h;

  useLayoutEffect(() => {
    const el = pilaRef.current;
    if (!el) return;
    const medir = () => setTam({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    medir();
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

  // Al cambiar de carta, la nueva arranca mirando el frente; en la mesa, la fila se desliza hasta ella.
  const arrastrando = useRef(false);
  const frenteActual = useCallback(
    () => pilaRef.current?.querySelector<HTMLElement>('.rol-top .frente-cuerpo, .mesa-slot.actual .frente-cuerpo') ?? null,
    [],
  );
  useEffect(() => {
    rot.jump(0);
    setVolteada(false);
    if (dorsoRef.current) dorsoRef.current.scrollTop = 0;
    const frente = frenteActual();
    if (frente) frente.scrollTop = 0;
    if (!arrastrando.current) animate(pos, indice, RESORTE);
  }, [indice, rot, pos, frenteActual]);

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

  const ir = useCallback(
    (k: number) => {
      const destino = Math.max(0, Math.min(cartas.length - 1, k));
      if (destino === indice) return void animate(pos, indice, RESORTE);
      vibrar();
      onIndice(destino);
    },
    [cartas.length, indice, onIndice, pos],
  );

  const siguiente = useCallback(() => {
    if (indice >= cartas.length - 1) return;
    if (!mesa) animate(xDe(indice), -off, RESORTE);
    ir(indice + 1);
  }, [indice, cartas, off, ir, mesa]);

  const anterior = useCallback(() => {
    if (indice <= 0) return;
    if (!mesa) animate(xDe(indice - 1), 0, RESORTE);
    ir(indice - 1);
  }, [indice, cartas, ir, mesa]);

  useEffect(() => {
    manejar?.({ siguiente, anterior, voltear });
  }, [manejar, siguiente, anterior, voltear]);

  // ---- Gestos con el dedo / mouse ----
  const gesto = useRef<{
    id: number;
    x0: number;
    y0: number;
    eje: 'h' | 'v' | 'nada' | null;
    tactil: boolean;
    muestras: { x: number; y: number; t: number }[];
  } | null>(null);

  const onPointerDown = (e: RPointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      // Sin esto el navegador empieza a seleccionar texto y a "arrastrarlo" en vez de mover la carta.
      if (!(e.target as HTMLElement).closest('.dorso-scroll, .frente-cuerpo.desborda')) e.preventDefault();
      window.getSelection()?.removeAllRanges();
    }
    gesto.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, eje: null, tactil: e.pointerType !== 'mouse', muestras: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
  };

  const moverHorizontal = (dx: number) => {
    if (mesa) {
      const p = indice - dx / paso;
      const max = cartas.length - 1;
      pos.set(p < 0 ? p * 0.3 : p > max ? max + (p - max) * 0.3 : p);
      return;
    }
    if (dx <= 0) {
      xDe(indice).set(indice < cartas.length - 1 ? dx : dx * 0.25);
      if (indice > 0) xDe(indice - 1).set(-off);
    } else if (indice > 0) {
      xDe(indice).set(0);
      xDe(indice - 1).set(-off + dx);
    } else {
      xDe(indice).set(dx * 0.25);
    }
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
      else if (Math.abs(dy) > 10) {
        // En el dorso, o en un frente que no entra, lo vertical es scroll nativo (y el borde lo maneja useTirarParaVoltear).
        const frente = frenteActual();
        g.eje = volteada || (g.tactil && frente && desborda(frente)) ? 'nada' : 'v';
      }
      else return;
      if (g.eje !== 'nada') (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      if (g.eje === 'h') arrastrando.current = true;
    }
    if (g.eje === 'h') moverHorizontal(dx);
    else if (g.eje === 'v' && cartas[indice]?.dorso) rot.set(Math.max(0, Math.min(180, (-dy / (altoGiro * 0.55)) * 180)));
  };

  const terminar = (e: RPointerEvent, cancelado: boolean) => {
    const g = gesto.current;
    if (!g || g.id !== e.pointerId) return;
    gesto.current = null;
    arrastrando.current = false;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    const m0 = g.muestras[0];
    const m1 = g.muestras[g.muestras.length - 1];
    const dt = Math.max(1, m1.t - m0.t);
    const vx = (m1.x - m0.x) / dt;
    const vy = (m1.y - m0.y) / dt;
    if (g.eje === 'h') {
      if (mesa) {
        // Con un tirón rápido la fila sigue de largo unas cartas más.
        const proyectado = cancelado ? indice : pos.get() - (vx * 180) / paso;
        const destino = Math.round(Math.max(indice - 6, Math.min(indice + 6, proyectado)));
        ir(destino);
        return;
      }
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

  // Dorso: arriba del todo, tirar hacia abajo = volver al frente.
  useTirarParaVoltear(() => dorsoRef.current, volteada, 'abajo', rot, altoGiro, voltear, indice);
  // Frente que no entra: abajo del todo, seguir deslizando hacia arriba = dar vuelta.
  useTirarParaVoltear(frenteActual, !volteada, 'arriba', rot, altoGiro, voltear, indice);

  // Rueda / touchpad: vertical da vuelta la carta; horizontal pasa de carta.
  const ruedaH = useRef({ acumulado: 0, hasta: 0 });
  const ruedaV = useRef({ ultimoScroll: 0 });
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      const r = ruedaH.current;
      if (e.timeStamp < r.hasta) return;
      r.acumulado += e.deltaX;
      if (Math.abs(r.acumulado) > 60) {
        if (r.acumulado > 0) siguiente();
        else anterior();
        r.acumulado = 0;
        r.hasta = e.timeStamp + 350;
      }
      return;
    }
    // Si la cara tiene scroll, primero se recorre; recién al llegar al borde (y con la inercia ya frenada) se da vuelta.
    const r = ruedaV.current;
    if (!volteada && e.deltaY > 0) {
      const frente = frenteActual();
      if (frente && desborda(frente) && !enElFondo(frente)) r.ultimoScroll = e.timeStamp;
      else if (e.timeStamp - r.ultimoScroll < 450) r.ultimoScroll = e.timeStamp;
      else if (e.deltaY > 30) voltear(true);
    } else if (volteada && e.deltaY < 0) {
      if ((dorsoRef.current?.scrollTop ?? 0) > 0) r.ultimoScroll = e.timeStamp;
      else if (e.timeStamp - r.ultimoScroll < 450) r.ultimoScroll = e.timeStamp;
      else if (e.deltaY < -30) voltear(false);
    }
  };

  const caras = (k: number, actual: boolean, conDorso: boolean) => {
    const carta = cartas[k];
    return (
      <Volteable
        rotX={actual ? rot : cero}
        inerte={!actual}
        frente={
          <CardFront carta={carta} numero={numeros[k]} acento={acento} practica={practica} pista={actual && pista} onVoltear={() => voltear(true)} />
        }
        dorso={
          conDorso ? (
            <CardBack
              ref={actual ? dorsoRef : undefined}
              carta={carta}
              acento={acento}
              relacionadas={relacionadas(carta)}
              onIr={onIr}
              onVolver={() => voltear(false)}
            />
          ) : null
        }
      />
    );
  };

  let contenido: ReactNode;
  if (mesa) {
    const ks: number[] = [];
    for (let k = indice - radio; k <= indice + radio; k++) if (k >= 0 && k < cartas.length) ks.push(k);
    contenido = ks.map((k) => (
      <CartaEnMesa
        key={clave(k)}
        k={k}
        pos={pos}
        paso={paso}
        ancho={anchoMesa}
        alto={altoCartaMesa}
        actual={k === indice}
        onElegir={() => ir(k)}
        etiqueta={`Ir a la carta ${numeros[k]}: ${cartas[k].titulo}`}
      >
        {caras(k, k === indice, k === indice)}
      </CartaEnMesa>
    ));
  } else {
    const roles = (
      [
        [indice - 1, 'prev'],
        [indice, 'top'],
        [indice + 1, 'b1'],
        [indice + 2, 'b2'],
      ] as [number, Rol][]
    ).filter(([k]) => k >= 0 && k < cartas.length);
    contenido = roles.map(([k, rol]) => (
      <CartaEnPila key={clave(k)} rol={rol} x={xDe(k)} off={off}>
        {caras(k, rol === 'top', rol === 'top' || rol === 'prev')}
      </CartaEnPila>
    ));
  }

  return (
    <div
      ref={pilaRef}
      className={`pila ${mesa ? 'modo-mesa' : 'modo-pila'} ${volteada ? 'volteada' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => terminar(e, false)}
      onPointerCancel={(e) => terminar(e, true)}
      onDragStart={(e) => e.preventDefault()}
      onWheel={onWheel}
    >
      {contenido}
    </div>
  );
}
