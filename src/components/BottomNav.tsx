import { navegar, type Pantalla } from '../router';
import { IconoCuadernos, IconoMazo } from './Iconos';

export function BottomNav({ activa }: { activa: Pantalla }) {
  return (
    <nav className="nav-inferior" aria-label="Secciones">
      <button type="button" className={activa === 'cuadernos' ? 'activa' : ''} aria-current={activa === 'cuadernos' ? 'page' : undefined} onClick={() => navegar('cuadernos')}>
        <IconoCuadernos />
        <span>Cuadernos</span>
      </button>
      <button type="button" className={activa === 'mazo' ? 'activa' : ''} aria-current={activa === 'mazo' ? 'page' : undefined} onClick={() => navegar('mazo')}>
        <IconoMazo />
        <span>Mazo</span>
      </button>
    </nav>
  );
}
