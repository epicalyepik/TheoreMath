import type { GraficoT } from '../model/schema';
import { compilar } from './expr';

/** Valida todas las expresiones de un gráfico; devuelve los errores encontrados. */
export function erroresGrafico(g: GraficoT): string[] {
  const errores: string[] = [];
  const probar = (expr: string, vars: string[], i: number) => {
    try {
      compilar(expr, vars);
    } catch (e) {
      errores.push(`grafico.elementos.${i}: ${(e as Error).message}`);
    }
  };
  g.elementos.forEach((el, i) => {
    if (el.tipo === 'funcion') probar(el.expr, ['x'], i);
    if (el.tipo === 'parametrica') {
      probar(el.x, ['t'], i);
      probar(el.y, ['t'], i);
    }
    if (el.tipo === 'region') {
      probar(el.superior, ['x'], i);
      if (el.inferior) probar(el.inferior, ['x'], i);
    }
  });
  if (g.x[0] >= g.x[1] || g.y[0] >= g.y[1]) errores.push('grafico: los rangos x e y deben ser [mínimo, máximo]');
  return errores;
}
