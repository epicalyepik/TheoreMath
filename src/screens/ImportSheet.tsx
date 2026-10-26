import { useEffect, useRef, useState } from 'react';
import { IconoArchivo, IconoCarpeta, IconoCopiar, IconoEnlace } from '../components/Iconos';
import { Sheet } from '../components/Sheet';
import { entradasDesdeFiles, importarEntradas } from '../import/files';
import { insertar } from '../import/merge';
import { importarDesdeUrl } from '../import/url';
import { copiarGuia } from '../import/guia';
import type { Fuente, ResultadoImport } from '../model/types';
import { navegar } from '../router';
import { actualizar } from '../store/library';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
  urlInicial?: string;
}

const soportaCarpetas = typeof document !== 'undefined' && 'webkitdirectory' in document.createElement('input');

export function ImportSheet({ abierta, onCerrar, urlInicial }: Props) {
  const [url, setUrl] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const archivos = useRef<HTMLInputElement>(null);
  const carpeta = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierta && urlInicial) setUrl(urlInicial);
    if (!abierta) {
      setResultado(null);
      setError(null);
    }
  }, [abierta, urlInicial]);

  const aplicar = async (r: ResultadoImport, fuente: Fuente) => {
    setResultado(r);
    if (r.nodos.length) await actualizar((b) => insertar(b, r.nodos, fuente));
  };

  const desdeArchivos = async (files: FileList | null) => {
    if (!files?.length) return;
    setCargando(true);
    setError(null);
    try {
      const entradas = await entradasDesdeFiles(files);
      const nombre = files.length === 1 ? files[0].name : `${files.length} archivos`;
      await aplicar(importarEntradas(entradas), { tipo: 'archivo', nombre, importado: Date.now() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
      if (archivos.current) archivos.current.value = '';
      if (carpeta.current) carpeta.current.value = '';
    }
  };

  const desdeUrl = async () => {
    if (!url.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const r = await importarDesdeUrl(url);
      await aplicar(r, { tipo: 'url', url: url.trim(), importado: Date.now() });
      setUrl('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <Sheet abierta={abierta} onCerrar={onCerrar} titulo={resultado ? 'Resultado' : 'Agregar contenido'} className="importar">
      {resultado ? (
        <div className="reporte">
          <p className={`reporte-resumen ${resultado.nodos.length ? 'ok' : 'mal'}`}>
            {resultado.nodos.length ? (
              <>
                <b>{resultado.cartas}</b> {resultado.cartas === 1 ? 'carta' : 'cartas'} en <b>{resultado.mazos}</b> {resultado.mazos === 1 ? 'mazo' : 'mazos'}
              </>
            ) : (
              'No se importó nada'
            )}
          </p>
          {resultado.problemas.length > 0 && (
            <>
              <h3 className="kicker">
                {resultado.problemas.length} {resultado.problemas.length === 1 ? 'aviso' : 'avisos'}
              </h3>
              <ul className="problemas">
                {resultado.problemas.map((p, i) => (
                  <li key={i}>
                    <b>{p.archivo}</b>
                    {p.donde && <span className="donde">{p.donde}</span>}
                    <span>{p.mensaje}</span>
                  </li>
                ))}
              </ul>
              <p className="ayuda">Podés pasarle estos avisos a la IA para que corrija el JSON.</p>
            </>
          )}
          <div className="fila-botones">
            <button type="button" className="boton secundario" onClick={() => setResultado(null)}>
              Importar más
            </button>
            <button type="button" className="boton" onClick={onCerrar}>
              Listo
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="menu-opciones">
            <button type="button" className="opcion" onClick={() => archivos.current?.click()} disabled={cargando}>
              <IconoArchivo />
              <span>
                <b>Archivos .json o .zip</b>
                <small>Elegí uno o varios. Un .zip con carpetas arma Materia › Unidad › Mazo</small>
              </span>
            </button>
            {soportaCarpetas && (
              <button type="button" className="opcion solo-escritorio" onClick={() => carpeta.current?.click()} disabled={cargando}>
                <IconoCarpeta />
                <span>
                  <b>Una carpeta</b>
                  <small>Desde la computadora, con todas sus subcarpetas</small>
                </span>
              </button>
            )}
            <input ref={archivos} type="file" accept=".json,.zip,application/json,application/zip" multiple hidden onChange={(e) => desdeArchivos(e.target.files)} />
            <input
              ref={carpeta}
              type="file"
              multiple
              hidden
              onChange={(e) => desdeArchivos(e.target.files)}
              {...({ webkitdirectory: '' } as Record<string, string>)}
            />
          </div>

          <form
            className="desde-url"
            onSubmit={(e) => {
              e.preventDefault();
              desdeUrl();
            }}
          >
            <label htmlFor="url-import" className="kicker">
              <IconoEnlace /> Desde un link
            </label>
            <div className="url-fila">
              <input
                id="url-import"
                type="url"
                inputMode="url"
                placeholder="https://github.com/usuario/repo/tree/main/apuntes"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="boton" disabled={cargando || !url.trim()}>
                {cargando ? '…' : 'Importar'}
              </button>
            </div>
            <small className="ayuda">Sirve un .json o .zip público, o una carpeta de GitHub. Google Drive no permite descargas directas.</small>
          </form>

          {error && <p className="error">{error}</p>}

          <div className="menu-opciones">
            <button type="button" className="opcion" onClick={copiarGuia}>
              <IconoCopiar />
              <span>
                <b>Copiar guía para IA</b>
                <small>Pegala en ChatGPT, Claude o Gemini y pedile el mazo que necesites</small>
              </span>
            </button>
          </div>

          <button type="button" className="enlace" onClick={() => {
            onCerrar();
            navegar('ayuda', ['ia']);
          }}>
            ¿Cómo armo los archivos?
          </button>
        </>
      )}
    </Sheet>
  );
}
