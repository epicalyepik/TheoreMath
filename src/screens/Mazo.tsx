import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeckStack, type DeckHandle } from '../cards/DeckStack';
import type { Relacionada } from '../cards/CardBack';
import { Glifo, TIPOS, dosDigitos } from '../cards/tipos';
import { IconoCuadernos, IconoMezclar, IconoOjo } from '../components/Iconos';
import { Sheet } from '../components/Sheet';
import { avisar } from '../components/Toast';
import { buscarCartaGlobal, ubicarMazo } from '../model/consultas';
import type { CartaT } from '../model/schema';
import { navegar, useRuta } from '../router';
import { useBiblioteca } from '../store/library';
import { setPrefs, usePrefs } from '../store/prefs';

function mezclar(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Mazo() {
  const bib = useBiblioteca();
  const prefs = usePrefs();
  const { ruta: rutaUrl, params } = useRuta();
  const ruta = rutaUrl.length ? rutaUrl : (prefs.ultimoMazo?.split('/') ?? []);
  const claveMazo = ruta.join('/');
  const info = useMemo(() => ubicarMazo(bib, ruta), [bib, claveMazo]);
  const total = info?.mazo.cartas.length ?? 0;

  const [orden, setOrden] = useState<number[] | null>(null);
  const [abanico, setAbanico] = useState(false);
  const deck = useRef<DeckHandle | null>(null);

  const secuencia = useMemo(() => orden ?? Array.from({ length: total }, (_, i) => i), [orden, total]);
  const cartas = useMemo(() => secuencia.map((i) => info!.mazo.cartas[i]), [secuencia, info]);
  const numeros = useMemo(() => secuencia.map((i) => i + 1), [secuencia]);
  const guardado = prefs.posiciones[claveMazo] ?? 0;
  const indice = Math.min(Math.max(0, guardado), Math.max(0, total - 1));

  const setIndice = useCallback(
    (i: number) => setPrefs((p) => ({ ...p, posiciones: { ...p.posiciones, [claveMazo]: i } })),
    [claveMazo],
  );

  // Recordar el último mazo abierto y volver a orden normal al cambiar de mazo.
  useEffect(() => {
    if (info) setPrefs((p) => (p.ultimoMazo === claveMazo ? p : { ...p, ultimoMazo: claveMazo }));
    setOrden(null);
  }, [claveMazo, info]);

  // ?carta=<id> abre directamente en esa carta.
  const cartaPedida = params.get('carta');
  useEffect(() => {
    if (!info || !cartaPedida) return;
    const i = info.mazo.cartas.findIndex((c) => c.id === cartaPedida);
    setOrden(null);
    if (i >= 0) setIndice(i);
    navegar('mazo', ruta, undefined, true);
  }, [cartaPedida, info]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (abanico || (e.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (e.key === 'ArrowRight') deck.current?.siguiente();
      else if (e.key === 'ArrowLeft') deck.current?.anterior();
      else if (e.key === 'ArrowUp' || e.key === ' ') {
        e.preventDefault();
        deck.current?.voltear(true);
      } else if (e.key === 'ArrowDown' || e.key === 'Escape') deck.current?.voltear(false);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [abanico]);

  const relacionadas = useCallback(
    (c: CartaT): Relacionada[] =>
      (c.dorso?.relacionadas ?? [])
        .map((id) => {
          const local = info?.mazo.cartas.find((x) => x.id === id);
          const r = local ?? buscarCartaGlobal(bib, id)?.carta;
          return r ? { id, titulo: r.titulo, tipo: r.tipo } : null;
        })
        .filter((x): x is Relacionada => !!x),
    [info, bib],
  );

  const irA = useCallback(
    (id: string) => {
      const pos = cartas.findIndex((c) => c.id === id);
      if (pos >= 0) return setIndice(pos);
      const g = buscarCartaGlobal(bib, id);
      if (g) navegar('mazo', g.ruta, { carta: id });
    },
    [cartas, bib, setIndice],
  );

  const onVolteo = useCallback(() => setPrefs((p) => (p.pistaVista >= 3 ? p : { ...p, pistaVista: p.pistaVista + 1 })), []);
  const manejar = useCallback((h: DeckHandle) => (deck.current = h), []);

  if (!info) {
    return (
      <main className="pantalla mazo-vacio">
        <div className="vacio">
          <div className="vacio-cartas" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>No hay un mazo abierto</h1>
          <p>Elegí una unidad en Cuadernos para poner sus cartas sobre la mesa.</p>
          <button type="button" className="boton" onClick={() => navegar('cuadernos')}>
            <IconoCuadernos /> Ir a Cuadernos
          </button>
        </div>
      </main>
    );
  }

  const mezclado = orden !== null;

  return (
    <main className="pantalla mazo" data-acento={info.acento}>
      <header className="mazo-cabeza">
        <button type="button" className="mazo-ruta" onClick={() => navegar('cuadernos', ruta.slice(0, -1))}>
          <span className="kicker">{info.titulos.slice(0, -1).join(' / ') || 'Mazo'}</span>
          <h1>{info.mazo.titulo}</h1>
        </button>
        <div className="mazo-acciones">
          <button
            type="button"
            className={`boton-icono ${prefs.practica ? 'activo' : ''}`}
            onClick={() => {
              setPrefs((p) => ({ ...p, practica: !p.practica }));
              avisar(prefs.practica ? 'Modo práctica desactivado' : 'Modo práctica: la respuesta queda tapada hasta que la toques');
            }}
            aria-pressed={prefs.practica}
            aria-label="Modo práctica"
            title="Modo práctica"
          >
            <IconoOjo tachado={prefs.practica} />
          </button>
          <button
            type="button"
            className={`boton-icono ${mezclado ? 'activo' : ''}`}
            onClick={() => {
              setOrden(mezclado ? null : mezclar(total));
              setIndice(0);
              avisar(mezclado ? 'Orden original' : 'Mazo mezclado');
            }}
            aria-pressed={mezclado}
            aria-label="Mezclar"
            title="Mezclar"
          >
            <IconoMezclar />
          </button>
          <button type="button" className="contador" onClick={() => setAbanico(true)} aria-label={`Carta ${indice + 1} de ${total}. Ver todas`}>
            <b>{dosDigitos(indice + 1)}</b>
            <span>/{dosDigitos(total)}</span>
          </button>
        </div>
      </header>

      <DeckStack
        key={claveMazo + (mezclado ? ':m' : '')}
        cartas={cartas}
        numeros={numeros}
        indice={indice}
        onIndice={setIndice}
        acento={info.acento}
        practica={prefs.practica}
        pista={prefs.pistaVista < 3}
        onVolteo={onVolteo}
        relacionadas={relacionadas}
        onIr={irA}
        manejar={manejar}
      />

      <div className="riel" aria-hidden="true">
        <div className="riel-marca" style={{ left: `${total > 1 ? (indice / (total - 1)) * 100 : 50}%` }} />
      </div>

      <Sheet abierta={abanico} onCerrar={() => setAbanico(false)} titulo={info.mazo.titulo} className="abanico">
        <ol className="abanico-grilla">
          {cartas.map((c, i) => (
            <li key={`${i}-${c.id}`}>
              <button
                type="button"
                className={`mini-carta ${i === indice ? 'actual' : ''}`}
                onClick={() => {
                  setIndice(i);
                  setAbanico(false);
                }}
              >
                <span className="mini-num">{dosDigitos(numeros[i])}</span>
                <span className="mini-glifo">
                  <Glifo tipo={c.tipo} />
                </span>
                <span className="mini-titulo">{c.titulo}</span>
                <span className="mini-tipo">{TIPOS[c.tipo].nombre}</span>
              </button>
            </li>
          ))}
        </ol>
      </Sheet>
    </main>
  );
}
