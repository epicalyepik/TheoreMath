import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  IconoAbanico,
  IconoArchivo,
  IconoBorrar,
  IconoCopiar,
  IconoMas,
  IconoMezclar,
  IconoOjo,
  IconoRefrescar,
  IconoVolver,
} from '../components/Iconos';
import { avisar } from '../components/Toast';
import { descargarCopia } from '../import/exportar';
import { copiarGuia } from '../import/guia';
import { insertar } from '../import/merge';
import { Prosa } from '../math/Tex';
import { bibliotecaVacia } from '../model/types';
import { navegar, useRuta } from '../router';
import { instalar, useInstalacion } from '../store/instalacion';
import { actualizar, bibliotecaDeEjemplo, getBiblioteca, guardar } from '../store/library';
import { resetPrefs } from '../store/prefs';

type Plataforma = 'android' | 'iphone' | 'pc';

const SECCIONES = [
  ['instalar', 'Instalar'],
  ['uso', 'Cómo se usa'],
  ['ia', 'Mazos con IA'],
  ['importar', 'Importar'],
  ['datos', 'Tus datos'],
  ['preguntas', 'Preguntas'],
] as const;

function plataformaInicial(): Plataforma {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iphone';
  if (/Android/.test(ua)) return 'android';
  return 'pc';
}

const PASOS: Record<Plataforma, { titulo: string; pasos: string[]; nota?: string }[]> = {
  android: [
    {
      titulo: 'Chrome',
      pasos: [
        'Abrí la app en **Chrome**.',
        'Tocá el menú **⋮** (arriba a la derecha).',
        'Elegí **Instalar app** (o **Agregar a pantalla principal**).',
        'Confirmá con **Instalar**. Aparece el ícono en tu inicio, como cualquier app.',
      ],
    },
    {
      titulo: 'Samsung Internet',
      pasos: ['Tocá el menú **≡** de abajo.', 'Elegí **Agregar página a** → **Pantalla de inicio**.'],
    },
  ],
  iphone: [
    {
      titulo: 'Safari',
      pasos: [
        'Abrí la app en **Safari**.',
        'Tocá el botón **Compartir** (el cuadrado con la flecha hacia arriba).',
        'Deslizá y elegí **Agregar a inicio**.',
        'Tocá **Agregar**. Se abre a pantalla completa, sin la barra del navegador.',
      ],
      nota: 'Desde iOS 16.4 también se puede hacer desde Chrome o Edge, con el mismo botón Compartir.',
    },
  ],
  pc: [
    {
      titulo: 'Chrome',
      pasos: [
        'En la barra de direcciones, a la derecha, hacé clic en el ícono de **instalar** (una pantalla con una flecha).',
        'Si no lo ves: menú **⋮** → **Transmitir, guardar y compartir** → **Instalar página como app**.',
        'Queda en el menú Inicio / Launchpad y se abre en su propia ventana.',
      ],
    },
    {
      titulo: 'Edge',
      pasos: ['Menú **…** → **Aplicaciones** → **Instalar este sitio como aplicación**.'],
    },
    {
      titulo: 'Safari en Mac',
      pasos: ['Menú **Archivo** → **Agregar al Dock**.'],
    },
    {
      titulo: 'Firefox',
      pasos: ['Firefox no instala apps web: guardala como **marcador** (Ctrl + D) y funciona igual, también sin internet.'],
    },
  ],
};

const GESTOS_TACTIL: [string, string][] = [
  ['Deslizar a la izquierda / derecha', 'Carta siguiente / anterior'],
  ['Deslizar hacia arriba', 'Dar vuelta la carta: explicación y ejemplos'],
  ['Tirar hacia abajo (arriba del dorso)', 'Volver al frente'],
  ['Mantener apretada una fórmula', 'Copiar su LaTeX'],
];

const GESTOS_PC: [string, string][] = [
  ['Arrastrar con el mouse', 'Mover las cartas sobre la mesa'],
  ['Clic en una carta del costado', 'Ir a esa carta'],
  ['← →  ·  deslizar de costado en el touchpad', 'Carta anterior / siguiente'],
  ['↑ o espacio  ·  rueda hacia abajo', 'Dar vuelta la carta'],
  ['↓ o Esc  ·  rueda hacia arriba', 'Volver al frente'],
];

const BOTONES: [ReactNode, string, string][] = [
  [<IconoAbanico key="a" />, 'Vista general', 'Todas las cartas del mazo en miniatura, con su fórmula principal. También se abre tocando el contador 03 / 24.'],
  [<IconoOjo key="o" />, 'Modo práctica', 'Tapa la tesis o la fórmula hasta que la tocás: primero intentá recordarla.'],
  [<IconoMezclar key="m" />, 'Mezclar', 'Cambia el orden de las cartas para repasar sin memorizar la secuencia.'],
];

const PREGUNTAS: [string, string][] = [
  [
    '¿Funciona sin internet?',
    'Sí. Después de abrirla una vez, la app y tus cuadernos quedan guardados en el dispositivo. Solo necesitás conexión para importar desde un link.',
  ],
  ['¿Cómo se actualiza?', 'Sola. Cuando hay una versión nueva se descarga en segundo plano y la ves la próxima vez que la abras.'],
  [
    '¿Por qué no puedo importar desde Google Drive?',
    'Drive no permite que otras páginas descarguen sus archivos. Usá un link de GitHub (archivo o carpeta), un Gist o Dropbox; o descargá el archivo y subilo con **Archivos .json o .zip**.',
  ],
  [
    '¿Puedo perder mis cuadernos?',
    'Se guardan en el navegador de este dispositivo. Si borrás los datos del sitio o desinstalás la app, se van. Hacé de vez en cuando una **copia** desde Tus datos.',
  ],
  [
    '¿Cómo paso mis cuadernos de la PC al celular?',
    'En la PC: **Exportar copia**. Mandate ese archivo (mail, Drive, WhatsApp) y en el celular importalo con **+ → Archivos .json o .zip**. Si tus mazos están en GitHub, importá el link en los dos y listo.',
  ],
  [
    '¿Cómo comparto un mazo?',
    'Subí el .json a GitHub o a un Gist y compartí este link: **teorem.netlify.app/#/importar?url=** seguido del link al archivo. Quien lo abra lo importa con un toque.',
  ],
  [
    '¿La IA se equivocó en el formato?',
    'La app importa lo que está bien y te lista cada aviso con el archivo, la carta y el campo. Copiá esos avisos y pedile a la IA que lo corrija.',
  ],
];

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={`ayuda-${id}`} className="ayuda-seccion">
      <h2>{titulo}</h2>
      {children}
    </section>
  );
}

function Pasos({ items }: { items: string[] }) {
  return (
    <ol className="ayuda-pasos">
      {items.map((p, i) => (
        <li key={i}>
          <Prosa texto={p} />
        </li>
      ))}
    </ol>
  );
}

function Qr({ url }: { url: string }) {
  const svg = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
  }, [url]);
  return <div className="ayuda-qr" role="img" aria-label={`Código QR de ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Confirmar({ icono, titulo, detalle, confirmar, peligro, onOk }: { icono: ReactNode; titulo: string; detalle: string; confirmar: string; peligro?: boolean; onOk: () => Promise<void> }) {
  const [armado, setArmado] = useState(false);
  return (
    <button
      type="button"
      className={`opcion ${peligro ? 'peligro' : ''} ${armado ? 'confirmar' : ''}`}
      onClick={async () => {
        if (!armado) return setArmado(true);
        await onOk();
        setArmado(false);
      }}
      onBlur={() => setArmado(false)}
    >
      {icono}
      <span>
        <b>{armado ? confirmar : titulo}</b>
        <small>{detalle}</small>
      </span>
    </button>
  );
}

export function Ayuda({ onImportar }: { onImportar: () => void }) {
  const { ruta } = useRuta();
  const [plataforma, setPlataforma] = useState<Plataforma>(plataformaInicial);
  const inst = useInstalacion();
  const [uso, setUso] = useState<string | null>(null);
  const url = location.origin + location.pathname;

  // #/ayuda/<seccion> lleva directo a esa parte.
  useEffect(() => {
    const destino = ruta[0];
    if (destino) requestAnimationFrame(() => document.getElementById(`ayuda-${destino}`)?.scrollIntoView({ block: 'start' }));
  }, [ruta]);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) => e.usage !== undefined && setUso(e.usage < 1024 * 1024 ? `${Math.max(1, Math.round(e.usage / 1024))} KB` : `${(e.usage / 1024 / 1024).toFixed(1)} MB`))
      .catch(() => {});
  }, []);

  const ir = (id: string) => document.getElementById(`ayuda-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className="pantalla pantalla-ayuda">
      <header className="barra">
        <button type="button" className="boton-icono" onClick={() => navegar('cuadernos')} aria-label="Volver a Cuadernos">
          <IconoVolver />
        </button>
        <div className="barra-titulo">
          <h1>Ayuda</h1>
        </div>
      </header>

      <nav className="ayuda-indice" aria-label="Temas">
        {SECCIONES.map(([id, nombre]) => (
          <button type="button" key={id} onClick={() => ir(id)}>
            {nombre}
          </button>
        ))}
      </nav>

      <Seccion id="instalar" titulo="Instalar la app">
        <p className="ayuda-texto">
          TheoreMath es una app web: se instala desde el navegador, ocupa muy poco, se abre a pantalla completa y funciona sin internet. No hace falta ninguna tienda.
        </p>

        {inst.instalada ? (
          <p className="ayuda-ok">✓ Ya la estás usando instalada.</p>
        ) : inst.disponible ? (
          <button
            type="button"
            className="boton ayuda-instalar"
            onClick={async () => {
              if (await instalar()) avisar('¡Listo! TheoreMath quedó instalada');
            }}
          >
            Instalar TheoreMath
          </button>
        ) : null}

        <div className="segmentado" role="tablist" aria-label="Dispositivo">
          {(
            [
              ['android', 'Android'],
              ['iphone', 'iPhone / iPad'],
              ['pc', 'Computadora'],
            ] as const
          ).map(([p, nombre]) => (
            <button type="button" key={p} role="tab" aria-selected={plataforma === p} className={plataforma === p ? 'activo' : ''} onClick={() => setPlataforma(p)}>
              {nombre}
            </button>
          ))}
        </div>

        <div className="ayuda-tarjetas">
          {PASOS[plataforma].map((b) => (
            <article key={b.titulo} className="ayuda-tarjeta">
              <h3 className="kicker">{b.titulo}</h3>
              <Pasos items={b.pasos} />
              {b.nota && <p className="ayuda-nota">{b.nota}</p>}
            </article>
          ))}
        </div>

        <div className="ayuda-enlace">
          {plataforma === 'pc' && <Qr url={url} />}
          <div>
            <h3 className="kicker">{plataforma === 'pc' ? 'Abrila en el celular' : 'Dirección de la app'}</h3>
            {plataforma === 'pc' && <p className="ayuda-texto">Escaneá el código con la cámara del celular, o abrí esta dirección:</p>}
            <div className="url-fila">
              <code className="ayuda-url">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</code>
              <button
                type="button"
                className="boton-icono"
                aria-label="Copiar dirección"
                onClick={() =>
                  navigator.clipboard.writeText(url).then(
                    () => avisar('Dirección copiada'),
                    () => avisar('No se pudo copiar'),
                  )
                }
              >
                <IconoCopiar />
              </button>
            </div>
          </div>
        </div>
      </Seccion>

      <Seccion id="uso" titulo="Cómo se usa">
        <p className="ayuda-texto">
          En <b>Cuadernos</b> están tus materias y unidades. Al tocar una unidad, sus cartas quedan sobre la mesa en <b>Mazo</b>. El frente es el machete: lo formal y lo mínimo. El dorso es para entender.
        </p>
        <div className="ayuda-tarjetas dos">
          <article className="ayuda-tarjeta">
            <h3 className="kicker">En el celular</h3>
            <dl className="ayuda-gestos">
              {GESTOS_TACTIL.map(([g, a]) => (
                <div key={g}>
                  <dt>{g}</dt>
                  <dd>{a}</dd>
                </div>
              ))}
            </dl>
          </article>
          <article className="ayuda-tarjeta">
            <h3 className="kicker">En la computadora</h3>
            <dl className="ayuda-gestos">
              {GESTOS_PC.map(([g, a]) => (
                <div key={g}>
                  <dt>{g}</dt>
                  <dd>{a}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>
        <ul className="ayuda-botones">
          {BOTONES.map(([icono, nombre, texto]) => (
            <li key={nombre}>
              <span className="ayuda-boton-icono">{icono}</span>
              <span>
                <b>{nombre}</b>
                <small>{texto}</small>
              </span>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion id="ia" titulo="Crear mazos con IA">
        <Pasos
          items={[
            'Tocá **Copiar guía para IA** (acá abajo o en el **+** de Cuadernos).',
            'Pegala en ChatGPT, Claude o Gemini y agregá lo que necesitás. Por ejemplo: "Haceme el mazo de la Unidad 2 de Análisis I: derivadas, Rolle, Lagrange y L\'Hôpital". Si tenés el programa o apuntes, adjuntalos.',
            'Guardá lo que te devuelve como archivo **.json** (o varios en carpetas, comprimidas en un **.zip**).',
            'Importalo con el **+** de Cuadernos.',
          ]}
        />
        <div className="menu-opciones">
          <button type="button" className="opcion" onClick={copiarGuia}>
            <IconoCopiar />
            <span>
              <b>Copiar guía para IA</b>
              <small>El pedido y el formato completo, listos para pegar</small>
            </span>
          </button>
        </div>
      </Seccion>

      <Seccion id="importar" titulo="Importar contenido">
        <ul className="ayuda-lista">
          <li>
            <Prosa texto="**Archivos .json** sueltos: cada uno es un mazo (o un árbol entero)." />
          </li>
          <li>
            <Prosa texto="**Un .zip con carpetas**: cada carpeta es una materia o unidad y cada .json adentro, un mazo. La profundidad es libre." />
          </li>
          <li>
            <Prosa texto="**Una carpeta** (solo en la computadora): elegís la carpeta y se importa con todas sus subcarpetas." />
          </li>
          <li>
            <Prosa texto="**Un link**: a un .json o .zip público, o a una **carpeta de GitHub**. Lo que entra por link se puede actualizar después desde el menú ⋯ de la ficha." />
          </li>
        </ul>
        <div className="menu-opciones">
          <button type="button" className="opcion" onClick={onImportar}>
            <IconoMas />
            <span>
              <b>Agregar contenido</b>
              <small>Archivos, .zip o link</small>
            </span>
          </button>
        </div>
      </Seccion>

      <Seccion id="datos" titulo="Tus datos">
        <p className="ayuda-texto">
          No hay cuentas ni servidores: tus cuadernos se guardan <b>en este dispositivo</b>
          {uso ? ` (ocupan ${uso})` : ''}. Cada dispositivo tiene su propia biblioteca. Si borrás los datos del navegador o desinstalás la app, se borran también.
        </p>
        <div className="menu-opciones">
          <button
            type="button"
            className="opcion"
            onClick={() => {
              descargarCopia(getBiblioteca());
              avisar('Copia descargada');
            }}
          >
            <IconoArchivo />
            <span>
              <b>Exportar copia</b>
              <small>Un .json con toda tu biblioteca. Importalo en otro dispositivo para tener lo mismo.</small>
            </span>
          </button>
          <Confirmar
            icono={<IconoRefrescar />}
            titulo="Restaurar ejemplos"
            confirmar="Tocá de nuevo para restaurar"
            detalle="Vuelve a cargar los cuadernos de muestra sin tocar los tuyos"
            onOk={async () => {
              const ej = await bibliotecaDeEjemplo();
              await actualizar((b) => insertar(b, ej.raices.map((nodo) => ({ ruta: [], nodo })), { tipo: 'ejemplo' }));
              avisar('Ejemplos restaurados');
            }}
          />
          <Confirmar
            icono={<IconoRefrescar />}
            titulo="Restablecer todo"
            confirmar="Tocá de nuevo para restablecer"
            detalle="Deja la app como recién instalada: solo los ejemplos y las opciones por defecto"
            peligro
            onOk={async () => {
              await guardar(await bibliotecaDeEjemplo());
              resetPrefs();
              avisar('Listo: la app quedó como nueva');
            }}
          />
          <Confirmar
            icono={<IconoBorrar />}
            titulo="Borrar todo"
            confirmar="Tocá de nuevo para borrar todo"
            detalle="Elimina todos los cuadernos de este dispositivo"
            peligro
            onOk={async () => {
              await guardar(bibliotecaVacia());
              avisar('Biblioteca vacía');
            }}
          />
        </div>
      </Seccion>

      <Seccion id="preguntas" titulo="Preguntas frecuentes">
        <div className="ayuda-preguntas">
          {PREGUNTAS.map(([p, r]) => (
            <details key={p}>
              <summary>{p}</summary>
              <p>
                <Prosa texto={r} />
              </p>
            </details>
          ))}
        </div>
      </Seccion>

      <footer className="ayuda-pie">
        <span>TheoreMath {__VERSION__}</span>
        <a href="https://github.com/epicalyepik/TheoreMath/blob/main/docs/GUIA_FORMATO.md" target="_blank" rel="noreferrer">
          Guía del formato
        </a>
      </footer>
    </main>
  );
}
