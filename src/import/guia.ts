import { avisar } from '../components/Toast';

/** Copia al portapapeles el pedido para la IA más la guía completa del formato. */
export async function copiarGuia() {
  try {
    const [prompt, guia] = await Promise.all([
      import('../../docs/PROMPT_IA.md?raw').then((m) => m.default),
      import('../../docs/GUIA_FORMATO.md?raw').then((m) => m.default),
    ]);
    await navigator.clipboard.writeText(`${prompt}\n\n---\n\n${guia}`);
    avisar('Guía copiada: pegala en el chat de la IA junto con tu tema');
  } catch {
    avisar('No se pudo copiar la guía');
  }
}
