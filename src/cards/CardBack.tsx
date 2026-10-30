import { forwardRef, type ReactNode } from 'react';
import type { CartaT } from '../model/schema';
import { Prosa } from '../math/Prosa';
import { CardFrame } from './CardFrame';
import { Glifo } from './tipos';

export interface Relacionada {
  id: string;
  titulo: string;
  tipo: CartaT['tipo'];
}

interface Props {
  carta: CartaT;
  acento: 'cian' | 'rosa';
  relacionadas: Relacionada[];
  onIr: (id: string) => void;
  onVolver: () => void;
}

function Seccion({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <section className={`dorso-seccion ${className ?? ''}`}>
      <h3 className="kicker">{titulo}</h3>
      {children}
    </section>
  );
}

const Lista = ({ items, className }: { items: string[]; className?: string }) => (
  <ul className={`dorso-lista ${className ?? ''}`}>
    {items.map((t, i) => (
      <li key={i}>
        <Prosa texto={t} />
      </li>
    ))}
  </ul>
);

export const CardBack = forwardRef<HTMLDivElement, Props>(function CardBack({ carta, acento, relacionadas, onIr, onVolver }, ref) {
  const d = carta.dorso ?? {};
  return (
    <CardFrame className="dorso" acento={acento}>
      <button type="button" className="dorso-cabeza" onClick={onVolver} aria-label="Volver al frente de la carta">
        <svg viewBox="0 0 24 12" aria-hidden="true">
          <path d="M4 3 L12 10 L20 3" />
        </svg>
        <span className="dorso-titulo">{carta.titulo}</span>
        <span className="dorso-glifo">
          <Glifo tipo={carta.tipo} />
        </span>
      </button>
      <div className="dorso-scroll" ref={ref}>
        {d.en_cristiano && (
          <Seccion titulo="En cristiano" className="destacada">
            <p>
              <Prosa texto={d.en_cristiano} />
            </p>
          </Seccion>
        )}
        {d.requisitos && d.requisitos.length > 0 && (
          <Seccion titulo="Qué hace falta">
            <Lista items={d.requisitos} className="check" />
          </Seccion>
        )}
        {d.cuando_usarlo && (
          <Seccion titulo="Cuándo usarlo">
            <p>
              <Prosa texto={d.cuando_usarlo} />
            </p>
          </Seccion>
        )}
        {d.idea_demostracion && (
          <Seccion titulo="Idea de la demostración">
            <p>
              <Prosa texto={d.idea_demostracion} />
            </p>
          </Seccion>
        )}
        {d.ejemplos && d.ejemplos.length > 0 && (
          <Seccion titulo={d.ejemplos.length > 1 ? 'Ejemplos' : 'Ejemplo'}>
            {d.ejemplos.map((ej, i) => (
              <article key={i} className="ejemplo">
                <p className="ejemplo-enunciado">
                  {d.ejemplos!.length > 1 && <span className="ejemplo-num">{i + 1}</span>}
                  <Prosa texto={ej.enunciado} />
                </p>
                {ej.pasos && ej.pasos.length > 0 && (
                  <ol className="ejemplo-pasos">
                    {ej.pasos.map((p, k) => (
                      <li key={k}>
                        <Prosa texto={p} />
                      </li>
                    ))}
                  </ol>
                )}
                {ej.resultado && (
                  <p className="ejemplo-resultado">
                    <Prosa texto={ej.resultado} />
                  </p>
                )}
              </article>
            ))}
          </Seccion>
        )}
        {d.errores_comunes && d.errores_comunes.length > 0 && (
          <Seccion titulo="Errores comunes">
            <Lista items={d.errores_comunes} className="cruz" />
          </Seccion>
        )}
        {d.extra?.map((x, i) => (
          <Seccion key={i} titulo={x.titulo}>
            <p>
              <Prosa texto={x.texto} />
            </p>
          </Seccion>
        ))}
        {relacionadas.length > 0 && (
          <Seccion titulo="Relacionadas">
            <div className="relacionadas">
              {relacionadas.map((r) => (
                <button type="button" key={r.id} className="relacionada" onClick={() => onIr(r.id)}>
                  <span className="glifo">
                    <Glifo tipo={r.tipo} />
                  </span>
                  {r.titulo}
                </button>
              ))}
            </div>
          </Seccion>
        )}
      </div>
    </CardFrame>
  );
});
