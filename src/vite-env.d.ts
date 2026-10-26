/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.md?raw' {
  const contenido: string;
  export default contenido;
}
