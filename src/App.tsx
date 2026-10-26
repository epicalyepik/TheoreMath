import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { Toast } from './components/Toast';
import { navegar, useRuta } from './router';
import { Cuadernos } from './screens/Cuadernos';
import { ImportSheet } from './screens/ImportSheet';
import { Mazo } from './screens/Mazo';
import { cargarBiblioteca } from './store/library';

export function App() {
  const { pantalla, params } = useRuta();
  const [listo, setListo] = useState(false);
  const [importar, setImportar] = useState(false);
  const urlCompartida = pantalla === 'importar' ? (params.get('url') ?? undefined) : undefined;

  useEffect(() => {
    cargarBiblioteca().finally(() => setListo(true));
  }, []);

  // #/importar?url=… abre la hoja de importación sobre Cuadernos.
  useEffect(() => {
    if (pantalla === 'importar') setImportar(true);
  }, [pantalla]);

  const cerrarImportar = useCallback(() => {
    setImportar(false);
    if (pantalla === 'importar') navegar('cuadernos', [], undefined, true);
  }, [pantalla]);

  const activa = pantalla === 'mazo' ? 'mazo' : 'cuadernos';

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        {listo ? activa === 'mazo' ? <Mazo /> : <Cuadernos onImportar={() => setImportar(true)} /> : <div className="pantalla cargando" aria-busy="true" />}
        <BottomNav activa={activa} />
        <ImportSheet abierta={importar} onCerrar={cerrarImportar} urlInicial={urlCompartida} />
        <Toast />
      </div>
    </MotionConfig>
  );
}
