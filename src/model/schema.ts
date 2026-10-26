import { z } from 'zod';

// Esquema del formato theoremath@1. Es la fuente de verdad: de acá sale el
// JSON Schema publicado (scripts/build-schema.mjs) y la validación al importar.

export const FORMATO = 'theoremath@1';

const latex = z.string().min(1, 'no puede estar vacío');
const texto = z.string().min(1, 'no puede estar vacío');
const id = z
  .string()
  .min(1, 'no puede estar vacío')
  .max(120)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i, 'solo letras, números, guiones y guiones bajos (sin espacios ni tildes)');

export const Color = z.enum(['cian', 'rosa', 'tenue', 'claro']);
const num = z.number().finite();
const rango = z.tuple([num, num]);
const par = z.tuple([num, num]);

const base = { color: Color.optional(), etiqueta: z.string().optional() };

export const ElementoGrafico = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('funcion'), expr: texto, dominio: rango.optional(), discontinua: z.boolean().optional(), ...base }),
  z.object({ tipo: z.literal('parametrica'), x: texto, y: texto, t: rango, discontinua: z.boolean().optional(), ...base }),
  z.object({ tipo: z.literal('punto'), x: num, y: num, hueco: z.boolean().optional(), ...base }),
  z.object({ tipo: z.literal('segmento'), desde: par, hasta: par, discontinua: z.boolean().optional(), ...base }),
  z.object({ tipo: z.literal('vector'), desde: par.optional(), hasta: par, ...base }),
  z.object({ tipo: z.literal('recta_v'), x: num, ...base }),
  z.object({ tipo: z.literal('recta_h'), y: num, ...base }),
  z.object({ tipo: z.literal('region'), superior: texto, inferior: texto.optional(), dominio: rango, ...base }),
  z.object({ tipo: z.literal('poligonal'), puntos: z.array(par).min(2), cerrada: z.boolean().optional(), discontinua: z.boolean().optional(), ...base }),
  z.object({ tipo: z.literal('texto'), x: num, y: num, texto: texto, color: Color.optional() }),
]);

export const Grafico = z.object({
  x: rango,
  y: rango,
  ejes: z.boolean().optional(),
  cuadricula: z.boolean().optional(),
  etiquetas_ejes: z.tuple([z.string(), z.string()]).optional(),
  elementos: z.array(ElementoGrafico).min(1),
});

export const TipoCarta = z.enum(['teorema', 'formula', 'definicion', 'estructura', 'propiedad', 'metodo']);

const Variante = z.object({ nombre: z.string().optional(), latex });

export const Frente = z.object({
  hipotesis: z.array(latex).optional(),
  tesis: latex.optional(),
  formula: latex.optional(),
  variantes: z.array(Variante).optional(),
  definicion: texto.optional(),
  axiomas: z.array(latex).optional(),
  pasos: z.array(texto).optional(),
  grafico: Grafico.optional(),
  nota: texto.optional(),
});

const Ejemplo = z.object({
  enunciado: texto,
  pasos: z.array(texto).optional(),
  resultado: texto.optional(),
});

export const Dorso = z.object({
  en_cristiano: texto.optional(),
  requisitos: z.array(texto).optional(),
  idea_demostracion: texto.optional(),
  ejemplos: z.array(Ejemplo).optional(),
  errores_comunes: z.array(texto).optional(),
  cuando_usarlo: texto.optional(),
  relacionadas: z.array(id).optional(),
  extra: z.array(z.object({ titulo: texto, texto })).optional(),
});

export const Carta = z
  .object({
    id,
    tipo: TipoCarta,
    titulo: texto,
    subtitulo: z.string().optional(),
    etiquetas: z.array(z.string()).optional(),
    frente: Frente,
    dorso: Dorso.optional(),
  })
  .superRefine((c, ctx) => {
    const f = c.frente;
    const vacio = !f.tesis && !f.formula && !f.definicion && !f.axiomas?.length && !f.pasos?.length && !f.grafico && !f.variantes?.length;
    if (vacio) {
      ctx.addIssue({
        code: 'custom',
        path: ['frente'],
        message: 'el frente necesita al menos uno de: tesis, formula, definicion, axiomas, pasos, variantes o grafico',
      });
    }
  });

const metaNodo = {
  id,
  titulo: texto,
  subtitulo: z.string().optional(),
  sigla: z.string().max(4).optional(),
  acento: z.enum(['cian', 'rosa']).optional(),
  orden: num.optional(),
};

export type NodoEntrada = {
  formato?: string;
  dentro_de?: string;
  id: string;
  titulo: string;
  subtitulo?: string;
  sigla?: string;
  acento?: 'cian' | 'rosa';
  orden?: number;
  hijos?: NodoEntrada[];
  cartas?: z.infer<typeof Carta>[];
};

export const Nodo: z.ZodType<NodoEntrada> = z.lazy(() =>
  z
    .object({
      formato: z.string().optional(),
      dentro_de: z.string().optional(),
      ...metaNodo,
      hijos: z.array(Nodo).optional(),
      cartas: z.array(Carta).optional(),
    })
    .superRefine((n, ctx) => {
      if (n.hijos && n.cartas) {
        ctx.addIssue({ code: 'custom', message: 'un nodo tiene "hijos" o "cartas", no ambos' });
      }
      if (!n.hijos && !n.cartas) {
        ctx.addIssue({ code: 'custom', message: 'falta "hijos" (subcarpetas) o "cartas" (mazo)' });
      }
    }),
);

// Metadatos de carpeta dentro de un ZIP (_carpeta.json): igual que un nodo pero sin contenido.
export const MetaCarpeta = z.object({ formato: z.string().optional(), ...metaNodo }).partial({ id: true, titulo: true });

// Solo los metadatos de un nodo: se usa al importar para validar carta por carta
// y poder conservar las válidas aunque alguna tenga errores.
export const MetaNodo = z.object({ formato: z.string().optional(), dentro_de: z.string().optional(), ...metaNodo });

export type CartaT = z.infer<typeof Carta>;
export type GraficoT = z.infer<typeof Grafico>;
export type ElementoGraficoT = z.infer<typeof ElementoGrafico>;
export type TipoCartaT = z.infer<typeof TipoCarta>;
export type MetaCarpetaT = z.infer<typeof MetaCarpeta>;
