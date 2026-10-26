import { describe, expect, it } from 'vitest';
import { partirTexto } from '../src/math/Tex';

describe('partirTexto', () => {
  it('separa matemática en línea y en bloque', () => {
    expect(partirTexto('si $x>0$ entonces $$y=x^2$$ listo')).toEqual([
      { tipo: 'texto', v: 'si ' },
      { tipo: 'math', v: 'x>0', display: false },
      { tipo: 'texto', v: ' entonces ' },
      { tipo: 'math', v: 'y=x^2', display: true },
      { tipo: 'texto', v: ' listo' },
    ]);
  });

  it('respeta \\$ como signo pesos y $ sin cerrar', () => {
    expect(partirTexto('cuesta \\$5')).toEqual([{ tipo: 'texto', v: 'cuesta $5' }]);
    expect(partirTexto('cuesta $5')).toEqual([{ tipo: 'texto', v: 'cuesta $5' }]);
  });

  it('no corta en \\$ dentro de la fórmula', () => {
    expect(partirTexto('$a \\$ b$')).toEqual([{ tipo: 'math', v: 'a \\$ b', display: false }]);
  });
});
