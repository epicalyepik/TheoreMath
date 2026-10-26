// Genera public/schema/theoremath.schema.json a partir del esquema zod de la app,
// así la guía para la IA y la validación al importar nunca se desincronizan.
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { FORMATO, Nodo } from '../src/model/schema.ts';

const schema = z.toJSONSchema(Nodo, { target: 'draft-2020-12', unrepresentable: 'any' });
const salida = {
  $id: 'https://epicalyepik.github.io/TheoreMath/schema/theoremath.schema.json',
  title: `TheoreMath (${FORMATO})`,
  description: 'Un nodo: carpeta (con "hijos") o mazo (con "cartas"). Ver docs/GUIA_FORMATO.md.',
  ...schema,
};
mkdirSync('public/schema', { recursive: true });
writeFileSync('public/schema/theoremath.schema.json', JSON.stringify(salida, null, 2) + '\n');
console.log('schema → public/schema/theoremath.schema.json');
