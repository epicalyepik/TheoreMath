import { Tex } from '../math/Tex';
import type { TipoCartaT } from '../model/schema';

// Los glifos se dibujan con KaTeX: así se ven igual en cualquier dispositivo.
export const TIPOS: Record<TipoCartaT, { nombre: string; glifo: string }> = {
  teorema: { nombre: 'Teorema', glifo: '\\forall' },
  formula: { nombre: 'Fórmula', glifo: 'f' },
  definicion: { nombre: 'Definición', glifo: '\\coloneqq' },
  estructura: { nombre: 'Estructura', glifo: '\\oplus' },
  propiedad: { nombre: 'Propiedad', glifo: '\\equiv' },
  metodo: { nombre: 'Método', glifo: '\\Rightarrow' },
};

export function Glifo({ tipo }: { tipo: TipoCartaT }) {
  return <Tex latex={TIPOS[tipo].glifo} className="glifo-tipo" />;
}

export const dosDigitos = (n: number) => String(n).padStart(2, '0');
