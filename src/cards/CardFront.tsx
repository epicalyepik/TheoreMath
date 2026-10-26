import { useState, type ReactNode } from 'react';
import type { CartaT } from '../model/schema';
import { Plot } from '../math/Plot';
import { Prosa, Tex } from '../math/Tex';
import { CardFrame, Regla } from './CardFrame';
import { Formula } from './Formula';
import { Glifo, TIPOS, dosDigitos } from './tipos';

interface Props {
  carta: CartaT;
  numero: number;
  acento: 'cian' | 'rosa';
  practica?: boolean;
  pista?: boolean;
  onVoltear?: () => void;
}

/** En modo práctica tapa la respuesta hasta que se toca. */
function Oculto({ activo, children }: { activo: boolean; children: ReactNode }) {
  const [visto, setVisto] = useState(false);
  if (!activo || visto) return <>{children}</>;
  return (
    <button type="button" className="oculto" onClick={() => setVisto(true)} aria-label="Mostrar respuesta">
      <div className="oculto-contenido" aria-hidden="true">
        {children}
      </div>
      <span className="oculto-rotulo">Tocá para ver</span>
    </button>
  );
}

export function Indice({ numero, tipo, className }: { numero: number; tipo?: CartaT['tipo']; className: string }) {
  return (
    <div className={`indice ${className}`} aria-hidden="true">
      <b>{dosDigitos(numero)}</b>
      {tipo && (
        <span>
          <Glifo tipo={tipo} />
        </span>
      )}
    </div>
  );
}

export function CardFront({ carta, numero, acento, practica = false, pista = false, onVoltear }: Props) {
  const f = carta.frente;
  const tieneDorso = !!carta.dorso && Object.keys(carta.dorso).length > 0;
  const hayRespuesta = !!(f.tesis || f.formula || f.definicion || f.axiomas?.length || f.variantes?.length || f.pasos?.length);

  return (
    <CardFrame className="frente" acento={acento}>
      <Indice numero={numero} tipo={carta.tipo} className="ai" />
      <Indice numero={numero} className="bd" />

      <div className="frente-cuerpo">
        <header className="frente-cabeza">
          <p className="kicker">{TIPOS[carta.tipo].nombre}</p>
          <h2 className="carta-titulo">{carta.titulo}</h2>
          {carta.subtitulo && <p className="carta-subtitulo">{carta.subtitulo}</p>}
        </header>

        {(hayRespuesta || f.hipotesis?.length) && (
          <section className="formal">
            {f.hipotesis && f.hipotesis.length > 0 && (
              <div className="hipotesis">
                <span className="rotulo">{f.tesis ? 'Si' : 'Hipótesis'}</span>
                {f.hipotesis.map((h, i) => (
                  <Formula key={i} latex={h} className="hip" />
                ))}
              </div>
            )}
            {hayRespuesta && (
              <Oculto activo={practica} key={carta.id}>
                {f.tesis && (
                  <div className="tesis">
                    {f.hipotesis?.length ? <span className="rotulo">Entonces</span> : null}
                    <Formula latex={f.tesis} className="principal" />
                  </div>
                )}
                {f.formula && <Formula latex={f.formula} className="principal" />}
                {f.definicion && (
                  <p className="definicion">
                    <Prosa texto={f.definicion} />
                  </p>
                )}
                {f.axiomas && f.axiomas.length > 0 && (
                  <ol className="axiomas">
                    {f.axiomas.map((a, i) => (
                      <li key={i}>
                        <Tex latex={a} />
                      </li>
                    ))}
                  </ol>
                )}
                {f.pasos && f.pasos.length > 0 && (
                  <ol className="pasos-frente">
                    {f.pasos.map((p, i) => (
                      <li key={i}>
                        <Prosa texto={p} />
                      </li>
                    ))}
                  </ol>
                )}
                {f.variantes && f.variantes.length > 0 && (
                  <dl className="variantes">
                    {f.variantes.map((v, i) => (
                      <div key={i} className="variante">
                        {v.nombre && <dt>{v.nombre}</dt>}
                        <dd>
                          <Formula latex={v.latex} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Oculto>
            )}
          </section>
        )}

        {f.grafico && (
          <div className="frente-grafico">
            <Oculto activo={practica && !hayRespuesta} key={`g-${carta.id}`}>
              <Plot grafico={f.grafico} />
            </Oculto>
          </div>
        )}

        {f.nota && (
          <p className="nota">
            <Prosa texto={f.nota} />
          </p>
        )}
      </div>

      {tieneDorso && (
        <button type="button" className={`pista-arriba ${pista ? 'con-texto' : ''}`} onClick={onVoltear} aria-label="Ver explicación y ejemplos">
          <svg viewBox="0 0 24 12" aria-hidden="true">
            <path d="M4 10 L12 3 L20 10" />
          </svg>
          {pista && <span>Deslizá para ver ejemplos</span>}
        </button>
      )}
      <Regla />
    </CardFrame>
  );
}
