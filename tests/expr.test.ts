import { describe, expect, it } from 'vitest';
import { compilar, ErrorExpr } from '../src/math/expr';

const ev = (s: string, x = 0) => compilar(s)({ x });

describe('compilar', () => {
  it('respeta precedencia y asociatividad', () => {
    expect(ev('1 + 2 * 3')).toBe(7);
    expect(ev('2^3^2')).toBe(512);
    expect(ev('-x^2', 3)).toBe(-9);
    expect(ev('(1 + 2) * 3')).toBe(9);
    expect(ev('10 / 4 / 5')).toBeCloseTo(0.5);
  });

  it('admite multiplicación implícita', () => {
    expect(ev('2x', 4)).toBe(8);
    expect(ev('3(x + 1)', 1)).toBe(6);
    expect(ev('x(x - 1)', 3)).toBe(6);
    expect(ev('2pi')).toBeCloseTo(2 * Math.PI);
    expect(ev('0.5*sin(2x)', Math.PI / 4)).toBeCloseTo(0.5);
  });

  it('conoce funciones y constantes', () => {
    expect(ev('ln(e)')).toBeCloseTo(1);
    expect(ev('log(100)')).toBeCloseTo(2);
    expect(ev('sqrt(16) + abs(-2)')).toBe(6);
    expect(ev('max(1, 5, 3)')).toBe(5);
    expect(ev('1e-3 * 1000')).toBeCloseTo(1);
  });

  it('usa las variables pedidas', () => {
    expect(compilar('cos(t)', ['t'])({ t: 0 })).toBe(1);
    expect(() => compilar('t + 1', ['x'])).toThrow(ErrorExpr);
  });

  it('rechaza código y expresiones rotas', () => {
    expect(() => compilar('alert(1)')).toThrow(/función desconocida/);
    expect(() => compilar('constructor')).toThrow(ErrorExpr);
    expect(() => compilar('x; 1')).toThrow(/no permitido/);
    expect(() => compilar('(x + 1')).toThrow(/se esperaba/);
    expect(() => compilar('x +')).toThrow(/incompleta/);
    expect(() => compilar('__proto__')).toThrow(ErrorExpr);
  });
});
