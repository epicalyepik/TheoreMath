import { useMemo, useState } from 'react';
import { Glifo, TIPOS } from '../cards/tipos';
import { IconoAyuda, IconoBorrar, IconoBuscar, IconoCerrar, IconoMas, IconoPuntos, IconoRefrescar, IconoVolver } from '../components/Iconos';
import { Sheet } from '../components/Sheet';
import { avisar } from '../components/Toast';
import { contarCartas, eliminar, insertar, ordenados } from '../import/merge';
import { importarDesdeUrl } from '../import/url';
import { acentoDe, buscar, cadena } from '../model/consultas';
import type { NodoLib } from '../model/types';
import { navegar, useRuta } from '../router';
import { actualizar, useBiblioteca } from '../store/library';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function Ficha({ nodo, ruta, sigla }: { nodo: NodoLib; ruta: string[]; sigla: string }) {
  const [menu, setMenu] = useState(false);
  const abrir = () => navegar(nodo.tipo === 'mazo' ? 'mazo' : 'cuadernos', ruta);
  const cuenta =
    nodo.tipo === 'mazo'
      ? `${nodo.cartas.length} ${nodo.cartas.length === 1 ? 'carta' : 'cartas'}`
      : `${nodo.hijos.length} ${nodo.hijos.length === 1 ? 'mazo' : 'mazos'}`;
  return (
    <li className={`ficha ${nodo.tipo}`}>
      <button type="button" className="ficha-cuerpo" onClick={abrir}>
        <span className="sigla" aria-hidden="true">
          <span>{sigla}</span>
        </span>
        <span className="ficha-texto">
          <span className="ficha-titulo">{nodo.titulo}</span>
          {nodo.subtitulo && <span className="ficha-subtitulo">{nodo.subtitulo}</span>}
        </span>
        <span className="ficha-cuenta">
          {cuenta}
          {nodo.tipo === 'carpeta' && <span className="ficha-flecha">›</span>}
        </span>
      </button>
      <button type="button" className="boton-icono ficha-menu" onClick={() => setMenu(true)} aria-label={`Opciones de ${nodo.titulo}`}>
        <IconoPuntos />
      </button>
      <MenuNodo nodo={nodo} ruta={ruta} abierto={menu} onCerrar={() => setMenu(false)} />
    </li>
  );
}

function MenuNodo({ nodo, ruta, abierto, onCerrar }: { nodo: NodoLib; ruta: string[]; abierto: boolean; onCerrar: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const url = nodo.fuente?.tipo === 'url' ? nodo.fuente.url : null;
  const cerrar = () => {
    setConfirmar(false);
    onCerrar();
  };
  const refrescar = async () => {
    if (!url) return;
    setCargando(true);
    try {
      const r = await importarDesdeUrl(url);
      // Se reinserta igual que en la importación original, así reemplaza al nodo por id.
      await actualizar((b) => insertar(b, r.nodos, { tipo: 'url', url, importado: Date.now() }));
      avisar(r.problemas.length ? `Actualizado con ${r.problemas.length} aviso(s)` : `Actualizado: ${r.cartas} cartas`);
      cerrar();
    } catch (e) {
      avisar(`No se pudo actualizar: ${(e as Error).message}`, 4000);
    } finally {
      setCargando(false);
    }
  };
  return (
    <Sheet abierta={abierto} onCerrar={cerrar} titulo={nodo.titulo}>
      <p className="menu-resumen">
        {nodo.tipo === 'mazo' ? 'Mazo' : 'Carpeta'} · {contarCartas(nodo)} cartas
        {nodo.fuente?.tipo === 'url' && (
          <>
            <br />
            <span className="menu-fuente">{nodo.fuente.url}</span>
          </>
        )}
      </p>
      <div className="menu-opciones">
        {url && (
          <button type="button" className="opcion" onClick={refrescar} disabled={cargando}>
            <IconoRefrescar />
            <span>
              <b>{cargando ? 'Actualizando…' : 'Actualizar desde el link'}</b>
              <small>Vuelve a descargar el contenido y reemplaza esta versión</small>
            </span>
          </button>
        )}
        {!confirmar ? (
          <button type="button" className="opcion peligro" onClick={() => setConfirmar(true)}>
            <IconoBorrar />
            <span>
              <b>Eliminar</b>
              <small>Se borra de este dispositivo</small>
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="opcion peligro confirmar"
            onClick={async () => {
              await actualizar((b) => eliminar(b, ruta));
              avisar(`"${nodo.titulo}" eliminado`);
              cerrar();
            }}
          >
            <IconoBorrar />
            <span>
              <b>Tocá de nuevo para eliminar</b>
              <small>No se puede deshacer</small>
            </span>
          </button>
        )}
      </div>
    </Sheet>
  );
}

function Seccion({ nodo, ruta, acento }: { nodo: NodoLib; ruta: string[]; acento: 'cian' | 'rosa' }) {
  const [menu, setMenu] = useState(false);
  if (nodo.tipo === 'mazo') return null;
  const hijos = ordenados(nodo.hijos);
  return (
    <section className="seccion" data-acento={acento}>
      <header className="seccion-cabeza">
        <button type="button" className="seccion-titulo" onClick={() => navegar('cuadernos', ruta)}>
          <span className="punto" aria-hidden="true" />
          <h2>{nodo.titulo}</h2>
        </button>
        <span className="seccion-cuenta">{contarCartas(nodo)} cartas</span>
        <button type="button" className="boton-icono chico" onClick={() => setMenu(true)} aria-label={`Opciones de ${nodo.titulo}`}>
          <IconoPuntos />
        </button>
      </header>
      {nodo.subtitulo && <p className="seccion-subtitulo">{nodo.subtitulo}</p>}
      <ul className="fichas">
        {hijos.map((h, j) => (
          <Ficha key={h.id} nodo={h} ruta={[...ruta, h.id]} sigla={h.sigla ?? LETRAS[j % 26]} />
        ))}
      </ul>
      <MenuNodo nodo={nodo} ruta={ruta} abierto={menu} onCerrar={() => setMenu(false)} />
    </section>
  );
}

function Resultados({ consulta }: { consulta: string }) {
  const bib = useBiblioteca();
  const res = useMemo(() => buscar(bib, consulta), [bib, consulta]);
  if (!res.length) return <p className="sin-resultados">Nada coincide con “{consulta}”.</p>;
  return (
    <ul className="resultados">
      {res.map((r, i) => (
        <li key={i}>
          <button
            type="button"
            className="resultado"
            data-acento={acentoDe(bib, r.ruta)}
            onClick={() => (r.carta ? navegar('mazo', r.ruta, { carta: r.carta.id }) : navegar('mazo', r.ruta))}
          >
            <span className="resultado-glifo" aria-hidden="true">
              {r.carta ? <Glifo tipo={r.carta.tipo} /> : '▤'}
            </span>
            <span className="resultado-texto">
              <b>{r.carta ? r.carta.titulo : r.mazo.titulo}</b>
              <small>{r.carta ? `${TIPOS[r.carta.tipo].nombre} · ${r.titulos.join(' / ')}` : `Mazo · ${r.mazo.cartas.length} cartas`}</small>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Cuadernos({ onImportar }: { onImportar: () => void }) {
  const bib = useBiblioteca();
  const { ruta } = useRuta();
  const [consulta, setConsulta] = useState('');
  const nodos = cadena(bib, ruta);
  const actual = nodos[nodos.length - 1];
  const valido = ruta.length === 0 || actual?.tipo === 'carpeta';
  const hijos = valido ? ordenados(actual?.tipo === 'carpeta' ? actual.hijos : bib.raices) : [];

  // Carpetas → secciones; mazos sueltos se agrupan juntos.
  const bloques: ({ tipo: 'seccion'; nodo: NodoLib } | { tipo: 'sueltos'; nodos: NodoLib[] })[] = [];
  for (const h of hijos) {
    if (h.tipo === 'carpeta') bloques.push({ tipo: 'seccion', nodo: h });
    else {
      const ult = bloques[bloques.length - 1];
      if (ult?.tipo === 'sueltos') ult.nodos.push(h);
      else bloques.push({ tipo: 'sueltos', nodos: [h] });
    }
  }

  return (
    <main className="pantalla cuadernos">
      <header className="barra">
        {ruta.length > 0 ? (
          <button type="button" className="boton-icono" onClick={() => navegar('cuadernos', ruta.slice(0, -1))} aria-label="Volver">
            <IconoVolver />
          </button>
        ) : (
          <span className="marca" aria-hidden="true">
            <span>∴</span>
          </span>
        )}
        <div className="barra-titulo">
          {ruta.length > 0 && (
            <nav className="migas" aria-label="Ubicación">
              <button type="button" onClick={() => navegar('cuadernos')}>
                Cuadernos
              </button>
              {nodos.slice(0, -1).map((n, i) => (
                <button type="button" key={n.id} onClick={() => navegar('cuadernos', ruta.slice(0, i + 1))}>
                  {n.titulo}
                </button>
              ))}
            </nav>
          )}
          <h1>{ruta.length ? (actual?.titulo ?? 'Cuadernos') : 'Cuadernos'}</h1>
        </div>
        <button type="button" className="boton-icono" onClick={() => navegar('ayuda')} aria-label="Ayuda" title="Ayuda">
          <IconoAyuda />
        </button>
        <button type="button" className="boton-icono acento" onClick={onImportar} aria-label="Agregar contenido">
          <IconoMas />
        </button>
      </header>

      <label className="buscador">
        <IconoBuscar />
        <input
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Buscar teoremas, fórmulas, temas…"
          enterKeyHint="search"
          autoComplete="off"
        />
        {consulta && (
          <button type="button" className="boton-icono chico" onClick={() => setConsulta('')} aria-label="Borrar búsqueda">
            <IconoCerrar />
          </button>
        )}
      </label>

      {consulta.trim() ? (
        <Resultados consulta={consulta} />
      ) : !valido ? (
        <div className="vacio">
          <h2>Esta carpeta ya no existe</h2>
          <button type="button" className="boton" onClick={() => navegar('cuadernos')}>
            Volver al inicio
          </button>
        </div>
      ) : hijos.length === 0 ? (
        <div className="vacio">
          <div className="vacio-cartas" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h2>Tu biblioteca está vacía</h2>
          <p>Subí archivos .json o .zip generados con la guía para IA, o pegá un link.</p>
          <button type="button" className="boton" onClick={onImportar}>
            <IconoMas /> Agregar contenido
          </button>
          <button type="button" className="enlace" onClick={() => navegar('ayuda')}>
            ¿Cómo empiezo?
          </button>
        </div>
      ) : (
        <div className="bloques">
          {bloques.map((b, i) =>
            b.tipo === 'seccion' ? (
              <Seccion key={b.nodo.id} nodo={b.nodo} ruta={[...ruta, b.nodo.id]} acento={acentoDe(bib, [...ruta, b.nodo.id])} />
            ) : (
              <section key={`s${i}`} className="seccion" data-acento={acentoDe(bib, [...ruta, b.nodos[0].id])}>
                <ul className="fichas">
                  {b.nodos.map((n, j) => (
                    <Ficha key={n.id} nodo={n} ruta={[...ruta, n.id]} sigla={n.sigla ?? LETRAS[j % 26]} />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </main>
  );
}
