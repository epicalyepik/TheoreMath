import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const IconoCuadernos = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H9v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M9 4h9.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H9" />
    <path d="M12.5 8.5h4M12.5 11.5h4" />
  </svg>
);

export const IconoMazo = (p: P) => (
  <svg {...base} {...p}>
    <rect x="7.5" y="3.5" width="11" height="15" rx="2.2" transform="rotate(8 13 11)" />
    <rect x="4.5" y="5.5" width="11" height="15" rx="2.2" />
    <path d="M10 10.5l1.2 1.2L10 12.9l-1.2-1.2z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconoBuscar = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
);

export const IconoMas = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconoCerrar = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconoVolver = (p: P) => (
  <svg {...base} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconoPuntos = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconoMezclar = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h3.5c2 0 3 1 4.5 3.5S14.5 17 16.5 17H20" />
    <path d="M4 17h3.5c1.2 0 2-.4 2.8-1.2M13.7 8.2c.8-.8 1.6-1.2 2.8-1.2H20" />
    <path d="M17.5 4.5L20 7l-2.5 2.5M17.5 14.5L20 17l-2.5 2.5" />
  </svg>
);

export const IconoOjo = ({ tachado, ...p }: P & { tachado?: boolean }) => (
  <svg {...base} {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.8" />
    {tachado && <path d="M4 20L20 4" />}
  </svg>
);

export const IconoArchivo = (p: P) => (
  <svg {...base} {...p}>
    <path d="M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8z" />
    <path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" />
  </svg>
);

export const IconoCarpeta = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />
  </svg>
);

export const IconoEnlace = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

export const IconoCopiar = (p: P) => (
  <svg {...base} {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
  </svg>
);

export const IconoRefrescar = (p: P) => (
  <svg {...base} {...p}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9" />
    <path d="M19.5 4.5V9H15" />
  </svg>
);

export const IconoBorrar = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 7h15M10 7V5h4v2M6.5 7l1 12.5h9l1-12.5" />
  </svg>
);

export const IconoAyuda = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.7" />
    <circle cx="12" cy="16.9" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconoAbanico = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.4" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.4" />
  </svg>
);
