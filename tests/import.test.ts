import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { importarEntradas, type Entrada } from '../src/import/files';
import { eliminar, fusionar, insertar, todosLosMazos } from '../src/import/merge';
import { parsearCarpetaGitHub, urlCruda } from '../src/import/url';
import { bibliotecaVacia, type Carpeta, type Mazo } from '../src/model/types';

const json = (ruta: string, v: unknown): Entrada => ({ ruta, datos: strToU8(JSON.stringify(v)) });
const carta = (id: string, extra: object = {}) => ({ id, tipo: 'formula', titulo: id.toUpperCase(), frente: { formula: 'x^2' }, ...extra });

function leerCarpeta(dir: string): Entrada[] {
  const out: Entrada[] = [];
  const rec = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) rec(p);
      else out.push({ ruta: relative(dir, p).split('\\').join('/'), datos: readFileSync(p) });
    }
  };
  rec(dir);
  return out;
}

describe('ejemplos incluidos', () => {
  it('se importan sin ningún aviso', () => {
    const r = importarEntradas(leerCarpeta(join(__dirname, '../ejemplos')));
    expect(r.problemas).toEqual([]);
    expect(r.nodos.map((n) => n.nodo.id)).toEqual(['algebra-lineal', 'analisis-matematico']);
    expect(r.mazos).toBe(5);
    expect(r.cartas).toBeGreaterThan(20);
  });

  it('todas las relacionadas apuntan a cartas existentes', () => {
    const r = importarEntradas(leerCarpeta(join(__dirname, '../ejemplos')));
    const bib = insertar(bibliotecaVacia(), r.nodos);
    const mazos = todosLosMazos(bib);
    const ids = new Set(mazos.flatMap((m) => m.mazo.cartas.map((c) => c.id)));
    const rotas = mazos.flatMap((m) => m.mazo.cartas.flatMap((c) => (c.dorso?.relacionadas ?? []).filter((id) => !ids.has(id))));
    expect(rotas).toEqual([]);
  });
});

describe('importarEntradas', () => {
  it('arma el árbol desde carpetas con profundidad variable', () => {
    const r = importarEntradas([
      json('Fisica/_carpeta.json', { titulo: 'Física I', acento: 'rosa' }),
      json('Fisica/02-dinamica.json', { id: 'dinamica', titulo: 'Dinámica', cartas: [carta('newton')] }),
      json('Fisica/01-cinematica/01-mru.json', { id: 'mru', titulo: 'MRU', cartas: [carta('v')] }),
      json('suelto.json', { id: 'suelto', titulo: 'Suelto', cartas: [carta('a')] }),
    ]);
    expect(r.problemas).toEqual([]);
    const fisica = r.nodos[0].nodo as Carpeta;
    expect(fisica).toMatchObject({ tipo: 'carpeta', id: 'fisica', titulo: 'Física I', acento: 'rosa' });
    expect(fisica.hijos.map((h) => h.id)).toEqual(['cinematica', 'dinamica']);
    expect((fisica.hijos[0] as Carpeta).titulo).toBe('Cinematica');
    expect(r.nodos[1].nodo.id).toBe('suelto');
    expect(r.mazos).toBe(3);
  });

  it('lee ZIPs', () => {
    const zip = zipSync({
      'Quimica/a.json': strToU8(JSON.stringify({ id: 'a', titulo: 'A', cartas: [carta('x')] })),
      '__MACOSX/Quimica/._a.json': strToU8('basura'),
      'Quimica/notas.txt': strToU8('ignorar'),
    });
    const r = importarEntradas([{ ruta: 'apuntes.zip', datos: zip }]);
    expect(r.problemas).toEqual([]);
    expect(r.nodos[0].nodo).toMatchObject({ tipo: 'carpeta', id: 'quimica' });
  });

  it('acepta un paquete con todo anidado y "dentro_de"', () => {
    const r = importarEntradas([
      json('paquete.json', { id: 'mate', titulo: 'Mate', hijos: [{ id: 'u1', titulo: 'U1', cartas: [carta('a')] }] }),
      json('extra.json', { id: 'u2', titulo: 'U2', dentro_de: 'mate', cartas: [carta('b')] }),
    ]);
    expect(r.problemas).toEqual([]);
    const bib = insertar(bibliotecaVacia(), r.nodos);
    expect(bib.raices).toHaveLength(1);
    expect((bib.raices[0] as Carpeta).hijos.map((h) => h.id)).toEqual(['u1', 'u2']);
  });

  it('acepta un archivo que es solo una lista de cartas', () => {
    const r = importarEntradas([json('02_mis-formulas.json', [carta('a'), carta('b')])]);
    expect(r.problemas).toEqual([]);
    expect(r.nodos[0].nodo).toMatchObject({ tipo: 'mazo', id: 'mis-formulas', titulo: 'Mis formulas' });
  });

  it('conserva las cartas válidas y reporta las inválidas en castellano', () => {
    const r = importarEntradas([
      json('u.json', {
        id: 'u',
        titulo: 'U',
        cartas: [
          carta('buena'),
          { id: 'sin-titulo', tipo: 'teorema', frente: { tesis: 'x' } },
          { id: 'tipo-raro', tipo: 'lema', titulo: 'L', frente: { tesis: 'x' } },
          { id: 'vacia', tipo: 'teorema', titulo: 'V', frente: {} },
          carta('buena'),
        ],
      }),
    ]);
    const mazo = r.nodos[0].nodo as Mazo;
    expect(mazo.cartas.map((c) => c.id)).toEqual(['buena', 'buena-2']);
    const msgs = r.problemas.map((p) => `${p.donde}: ${p.mensaje}`);
    expect(msgs[0]).toMatch(/carta 2 \(sin-titulo\).*titulo/);
    expect(msgs[1]).toMatch(/carta 3.*tipo/);
    expect(msgs[2]).toMatch(/carta 4.*el frente necesita/);
    expect(msgs[3]).toMatch(/id repetido/);
  });

  it('quita gráficos con expresiones inválidas', () => {
    const r = importarEntradas([
      json('g.json', {
        id: 'g',
        titulo: 'G',
        cartas: [carta('a', { frente: { formula: 'x', grafico: { x: [0, 1], y: [0, 1], elementos: [{ tipo: 'funcion', expr: 'x +* 2' }] } } })],
      }),
    ]);
    expect((r.nodos[0].nodo as Mazo).cartas[0].frente.grafico).toBeUndefined();
    expect(r.problemas[0].mensaje).toMatch(/se quitó el gráfico/);
  });

  it('reporta JSON mal formado', () => {
    const r = importarEntradas([{ ruta: 'roto.json', datos: strToU8('{ "id": ') }]);
    expect(r.nodos).toEqual([]);
    expect(r.problemas[0].mensaje).toMatch(/JSON mal formado/);
  });
});

describe('fusionar', () => {
  const m = (id: string, n = 1): Mazo => ({ tipo: 'mazo', id, titulo: id, cartas: Array.from({ length: n }, (_, i) => carta(`c${i}`) as Mazo['cartas'][0]) });
  const c = (id: string, hijos: (Mazo | Carpeta)[]): Carpeta => ({ tipo: 'carpeta', id, titulo: id, hijos });

  it('combina carpetas y reemplaza mazos con el mismo id', () => {
    const viejo = [c('mate', [m('u1'), m('u2')])];
    const nuevo = c('mate', [m('u2', 3), m('u3')]);
    const r = fusionar(viejo, nuevo)[0] as Carpeta;
    expect(r.hijos.map((h) => h.id)).toEqual(['u1', 'u2', 'u3']);
    expect((r.hijos[1] as Mazo).cartas).toHaveLength(3);
  });

  it('elimina por ruta', () => {
    const bib = { version: 1 as const, raices: [c('mate', [m('u1'), m('u2')])] };
    expect((eliminar(bib, ['mate', 'u1']).raices[0] as Carpeta).hijos.map((h) => h.id)).toEqual(['u2']);
  });
});

describe('links', () => {
  it('reconoce carpetas de GitHub', () => {
    expect(parsearCarpetaGitHub(new URL('https://github.com/ana/apuntes/tree/main/analisis/u1'))).toEqual({ owner: 'ana', repo: 'apuntes', rama: 'main', ruta: 'analisis/u1' });
    expect(parsearCarpetaGitHub(new URL('https://github.com/ana/apuntes'))).toMatchObject({ rama: '', ruta: '' });
    expect(parsearCarpetaGitHub(new URL('https://example.com/a/b'))).toBeNull();
  });

  it('convierte links de vista a links de descarga', () => {
    expect(urlCruda(new URL('https://github.com/ana/apuntes/blob/main/u1.json')).href).toBe('https://raw.githubusercontent.com/ana/apuntes/main/u1.json');
    expect(urlCruda(new URL('https://www.dropbox.com/s/abc/u1.json?dl=0')).href).toBe('https://dl.dropboxusercontent.com/s/abc/u1.json?dl=1');
  });
});
