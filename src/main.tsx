import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/jetbrains-mono/wght.css';
import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { escucharInstalacion } from './store/instalacion';

registerSW({ immediate: true });
escucharInstalacion();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
