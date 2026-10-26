/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __VERSION__: string;

declare module '*.md?raw' {
  const contenido: string;
  export default contenido;
}
