# TheoreMath

Machete de teoremas y fórmulas en forma de **mazo de cartas**, pensado para el celular: deslizás de costado para pasar de carta y hacia arriba para darla vuelta y ver la explicación en cristiano, los requisitos y ejemplos resueltos.

Todo el contenido sale de **archivos JSON** que podés generar con una IA siguiendo la guía de formato.

**App: https://teorem.netlify.app**

## Instalarla

La app es una **PWA**: una página web que se instala como app, se abre en su propia ventana y funciona sin internet. Adentro de la app, el botón **?** de Cuadernos tiene la guía completa (con un botón *Instalar* cuando el navegador lo permite).

| Dispositivo | Cómo |
| ----------- | ---- |
| Android (Chrome) | Menú `⋮` → *Instalar app* / *Agregar a pantalla principal* |
| iPhone / iPad (Safari) | Botón Compartir → *Agregar a inicio* |
| PC (Chrome) | Ícono de instalar en la barra de direcciones, o menú `⋮` → *Transmitir, guardar y compartir* → *Instalar página como app* |
| PC (Edge) | Menú `…` → *Aplicaciones* → *Instalar este sitio como aplicación* |
| Mac (Safari) | *Archivo* → *Agregar al Dock* |

En la PC, la sección de Ayuda muestra un código QR para abrir la app en el celular.

No hay base de datos ni cuenta: tus cuadernos se guardan **en el propio dispositivo** (IndexedDB) y cada uno tiene su biblioteca. Para pasarlos a otro: **Ayuda → Tus datos → Exportar copia**, y en el otro dispositivo importás ese .json. También podés subir tus JSON a GitHub e importarlos por link; después *Actualizar desde el link* trae la última versión.

## Crear contenido con IA

1. En la app: **Cuadernos → + → Copiar guía para IA** (copia el pedido y la guía de formato completa).
2. Pegala en ChatGPT, Claude o Gemini y agregá lo que necesitás, por ejemplo: *"Haceme el mazo de la Unidad 2 de Análisis I: derivadas, Rolle, Lagrange, L'Hôpital"*. Si tenés el programa o apuntes, adjuntalos.
3. Guardá la respuesta como `.json` (o varios en carpetas, comprimidas en un `.zip`).
4. **Cuadernos → + → Archivos .json o .zip**, o **Desde un link**.

Si algo está mal, la app importa lo que sirve y lista los avisos (archivo, carta y campo). Pasáselos a la IA para que corrija el JSON.

- Guía completa: [`docs/GUIA_FORMATO.md`](docs/GUIA_FORMATO.md)
- Pedido para la IA: [`docs/PROMPT_IA.md`](docs/PROMPT_IA.md)
- JSON Schema formal: [`public/schema/theoremath.schema.json`](public/schema/theoremath.schema.json) (se genera desde el validador de la app)
- Ejemplos reales: [`ejemplos/`](ejemplos) (es también la biblioteca de muestra que trae la app)

### Fuentes que acepta

| Fuente                        | Ejemplo                                               |
| ----------------------------- | ----------------------------------------------------- |
| Uno o varios `.json`          | `01-limites.json`                                     |
| Un `.zip` con carpetas        | `analisis/01-limites.json`, `analisis/_carpeta.json`  |
| Link a un JSON o ZIP          | `https://raw.githubusercontent.com/…/limites.json`    |
| Carpeta de GitHub             | `https://github.com/usuario/repo/tree/main/apuntes`   |
| Archivo de GitHub, Gist, Dropbox | Se convierten solos a descarga directa             |

Google Drive no sirve: no permite descargas desde otras páginas.

Para compartir un mazo: `https://teorem.netlify.app/#/importar?url=<link>`.

## Gestos

| Gesto                                   | Acción                                          |
| --------------------------------------- | ----------------------------------------------- |
| Deslizar a la izquierda / derecha       | Carta siguiente / anterior                      |
| Deslizar hacia arriba                   | Dar vuelta: explicación y ejemplos              |
| Tirar hacia abajo (arriba del dorso)    | Volver al frente                                |
| Tocar el contador `03 / 24`             | Ver todas las cartas del mazo y saltar          |
| Mantener apretada una fórmula           | Copiar su LaTeX                                 |
| Botón ojo                               | Modo práctica: tapa la respuesta hasta tocarla  |
| Botón de cuadrícula                     | Vista general: todas las cartas en miniatura    |
| Botón flechas cruzadas                  | Mezclar el mazo                                 |
| Teclado (computadora)                   | `←` `→` navegar, `↑` / espacio voltear, `↓` / Esc volver |

En PC y tablet las cartas se ven en fila sobre la mesa (la actual al centro y las vecinas a los costados): se arrastran con el mouse, se pasan con el touchpad o se elige una haciendo clic.

## Desarrollo

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests (parser, validación, importación)
npm run build      # genera el schema, chequea tipos y compila a dist/
```

Stack: Vite + React + TypeScript, KaTeX para las fórmulas, zod para validar el JSON, motion para los gestos y vite-plugin-pwa para el modo offline. Los gráficos son SVG propios con un parser de expresiones propio (sin `eval`).

### Publicación

Está en Netlify, que compila y publica solo con cada push a `main` usando `netlify.toml` (`npm run build` → `dist/`). El CI de GitHub (`.github/workflows/ci.yml`) corre los tests y el build en cada rama y PR.
