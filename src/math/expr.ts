// Parser de expresiones matemáticas para los gráficos. Nunca usa eval: arma
// funciones a partir de un árbol con un conjunto cerrado de operaciones.
//
//   compilar('x^2 - 2x + 1', ['x'])  →  ({ x }) => number
//
// Admite + - * / ^, paréntesis, multiplicación implícita (2x, 3(x+1), (x)(x)),
// constantes pi y e, y funciones: sin cos tan asin acos atan sinh cosh tanh
// exp ln log (base 10) log2 sqrt cbrt abs floor ceil round sign min max pow.

type Fn = (v: Record<string, number>) => number;

const FUNCIONES: Record<string, (...a: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  arcsin: Math.asin,
  arccos: Math.acos,
  arctan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  sen: Math.sin,
};

const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E, π: Math.PI };

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

export class ErrorExpr extends Error {}

function tokenizar(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s.slice(i));
      if (!m) throw new ErrorExpr(`número inválido en "${s.slice(i)}"`);
      out.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
    } else if (/[a-zA-Zπ_]/.test(c)) {
      const m = /^[a-zA-Zπ_][a-zA-Z0-9_]*/.exec(s.slice(i))!;
      out.push({ t: 'id', v: m[0] });
      i += m[0].length;
    } else if ('+-*/^(),'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else if (c === '·' || c === '×') {
      out.push({ t: 'op', v: '*' });
      i++;
    } else {
      throw new ErrorExpr(`símbolo no permitido "${c}"`);
    }
  }
  return out;
}

export function compilar(expr: string, variables: string[] = ['x']): Fn {
  const toks = tokenizar(expr);
  let p = 0;
  const ver = () => toks[p];
  const esOp = (v: string) => ver()?.t === 'op' && ver().v === v;
  const esperar = (v: string) => {
    if (!esOp(v)) throw new ErrorExpr(`se esperaba "${v}" en "${expr}"`);
    p++;
  };

  function suma(): Fn {
    let izq = producto();
    while (esOp('+') || esOp('-')) {
      const op = toks[p++].v;
      const a = izq;
      const b = producto();
      izq = op === '+' ? (v) => a(v) + b(v) : (v) => a(v) - b(v);
    }
    return izq;
  }

  function comienzaFactor() {
    const k = ver();
    return k && (k.t === 'num' || k.t === 'id' || (k.t === 'op' && k.v === '('));
  }

  function producto(): Fn {
    let izq = unario();
    for (;;) {
      if (esOp('*') || esOp('/')) {
        const op = toks[p++].v;
        const a = izq;
        const b = unario();
        izq = op === '*' ? (v) => a(v) * b(v) : (v) => a(v) / b(v);
      } else if (comienzaFactor()) {
        const a = izq;
        const b = potencia();
        izq = (v) => a(v) * b(v);
      } else {
        return izq;
      }
    }
  }

  function unario(): Fn {
    if (esOp('-')) {
      p++;
      const a = unario();
      return (v) => -a(v);
    }
    if (esOp('+')) {
      p++;
      return unario();
    }
    return potencia();
  }

  function potencia(): Fn {
    const base = atomo();
    if (esOp('^')) {
      p++;
      const exp = unario();
      return (v) => Math.pow(base(v), exp(v));
    }
    return base;
  }

  function atomo(): Fn {
    const k = toks[p++];
    if (!k) throw new ErrorExpr(`expresión incompleta: "${expr}"`);
    if (k.t === 'num') return () => k.v;
    if (k.t === 'op' && k.v === '(') {
      const a = suma();
      esperar(')');
      return a;
    }
    if (k.t === 'id') {
      const nombre = k.v;
      const clave = nombre.toLowerCase();
      const esVariable = variables.includes(nombre) || Object.hasOwn(CONSTANTES, clave);
      if (esOp('(') && !esVariable) {
        const f = Object.hasOwn(FUNCIONES, clave) ? FUNCIONES[clave] : undefined;
        if (!f) throw new ErrorExpr(`función desconocida "${nombre}"`);
        p++;
        const args: Fn[] = [suma()];
        while (esOp(',')) {
          p++;
          args.push(suma());
        }
        esperar(')');
        return (v) => f(...args.map((a) => a(v)));
      }
      if (variables.includes(nombre)) return (v) => v[nombre];
      if (Object.hasOwn(CONSTANTES, clave)) {
        const c = CONSTANTES[clave];
        return () => c;
      }
      throw new ErrorExpr(`nombre desconocido "${nombre}" (variables permitidas: ${variables.join(', ')})`);
    }
    throw new ErrorExpr(`"${k.v}" fuera de lugar en "${expr}"`);
  }

  const f = suma();
  if (p < toks.length) throw new ErrorExpr(`sobra "${toks[p].t === 'num' ? toks[p].v : (toks[p] as { v: string }).v}" en "${expr}"`);
  return f;
}
