# Guía del formato `theoremath@1`

Todo el contenido de TheoreMath sale de archivos JSON. Esta guía describe el formato completo. El JSON Schema formal está en `public/schema/theoremath.schema.json` (en la app publicada: `schema/theoremath.schema.json`).

---

## 1. Árbol: carpetas y mazos

La biblioteca es un árbol de **nodos** de profundidad libre. Hay dos tipos de nodo:

- **Carpeta**: tiene `hijos` (otros nodos). Ej.: una materia, un parcial, un bloque temático.
- **Mazo**: tiene `cartas`. Es lo que se estudia en la pestaña *Mazo*.

Un nodo tiene `hijos` **o** `cartas`, nunca los dos.

| Campo       | Tipo                 | Obligatorio | Descripción                                                                  |
| ----------- | -------------------- | ----------- | ---------------------------------------------------------------------------- |
| `formato`   | `"theoremath@1"`     | recomendado | Versión del formato. Ponelo en la raíz de cada archivo.                       |
| `id`        | texto                | sí\*        | Identificador único entre hermanos: minúsculas, números, `-` o `_`.          |
| `titulo`    | texto                | sí\*        | Nombre visible ("Límites y Continuidad").                                    |
| `subtitulo` | texto                | no          | Una línea con lo que incluye ("Bolzano, Weierstrass y límites notables").    |
| `sigla`     | texto (≤ 4)          | no          | Letra o número en la ficha (`"A"`, `"II"`). Si falta: A, B, C… por orden.    |
| `acento`    | `"cian"` \| `"rosa"` | no          | Color de la materia. Los hijos lo heredan. Si falta, se alterna por materia. |
| `orden`     | número               | no          | Para ordenar hermanos. Si falta, se respeta el orden de los archivos.        |
| `dentro_de` | texto                | no          | Solo en la raíz de un archivo: ruta de ids donde ubicarlo (`"analisis"`).    |
| `hijos`     | lista de nodos       | —           | Para carpetas.                                                               |
| `cartas`    | lista de cartas      | —           | Para mazos.                                                                  |

\* Si falta `id` se genera a partir del título o del nombre del archivo; si falta `titulo`, a partir del nombre del archivo.

### Tres formas de organizar los archivos

**a) Carpetas (recomendado).** Cada carpeta es un nodo y cada `.json` adentro es un mazo. Se suben como `.zip`.

```
apuntes.zip
├── analisis-matematico/
│   ├── _carpeta.json            ← datos de la carpeta (opcional)
│   ├── 01-limites.json          ← mazo
│   ├── 02-derivadas.json        ← mazo
│   └── 03-integrales/           ← sub-carpeta: la profundidad es libre
│       ├── 01-riemann.json
│       └── 02-metodos.json
└── algebra-lineal/
    ├── _carpeta.json
    └── 01-espacios-vectoriales.json
```

- `_carpeta.json` lleva solo los datos del nodo: `{ "id": "analisis-matematico", "titulo": "Análisis Matemático", "acento": "cian" }`.
- Sin `_carpeta.json`, el nombre de la carpeta se usa como título (`03-integrales` → "Integrales").
- Los prefijos numéricos (`01-`, `02_`) solo sirven para ordenar; no aparecen en el título.

**b) Paquete.** Un único `.json` con todo anidado en `hijos`:

```json
{
  "formato": "theoremath@1",
  "id": "analisis-matematico",
  "titulo": "Análisis Matemático",
  "hijos": [
    { "id": "limites", "titulo": "Límites", "sigla": "A", "cartas": [ … ] },
    { "id": "derivadas", "titulo": "Derivadas", "sigla": "B", "cartas": [ … ] }
  ]
}
```

**c) Mazo suelto.** Un `.json` con un solo mazo. Con `"dentro_de": "analisis-matematico"` se agrega adentro de esa materia (si no existe, se crea).

### Actualizar contenido

Volver a importar un nodo con el **mismo `id`** en el mismo lugar lo **reemplaza** (si es mazo) o **combina** sus hijos (si es carpeta). Así podés corregir un mazo sin tocar los demás.

---

## 2. La carta

```json
{
  "id": "bolzano",
  "tipo": "teorema",
  "titulo": "Teorema de Bolzano",
  "subtitulo": "Existencia de raíces en funciones continuas",
  "etiquetas": ["continuidad", "raíces"],
  "frente": { … },
  "dorso": { … }
}
```

| Campo       | Obligatorio | Descripción                                                                   |
| ----------- | ----------- | ----------------------------------------------------------------------------- |
| `id`        | sí          | Único dentro del mazo. Se usa en `relacionadas`.                               |
| `tipo`      | sí          | `teorema`, `formula`, `definicion`, `estructura`, `propiedad` o `metodo`.      |
| `titulo`    | sí          | Nombre corto. Va grande en el frente.                                          |
| `subtitulo` | no          | Una línea: qué dice o para qué sirve.                                          |
| `etiquetas` | no          | Palabras para el buscador (no se muestran).                                    |
| `frente`    | sí          | Lo formal y mínimo. Ver abajo.                                                 |
| `dorso`     | no          | Lo que aparece al deslizar hacia arriba: explicación, ejemplos, errores, etc.  |

### 2.1 Frente

Todos los campos son opcionales, pero tiene que haber **al menos uno** de: `tesis`, `formula`, `definicion`, `axiomas`, `pasos`, `variantes`, `grafico`.

| Campo        | Tipo                           | Se muestra como                                             |
| ------------ | ------------------------------ | ----------------------------------------------------------- |
| `hipotesis`  | lista de LaTeX                 | Bloque "Si", una línea por hipótesis.                       |
| `tesis`      | LaTeX                          | Bloque "Entonces", grande y en color.                       |
| `formula`    | LaTeX                          | Fórmula principal, grande y en color.                       |
| `variantes`  | lista de `{ nombre?, latex }`  | Fórmulas secundarias con un rótulo chico.                   |
| `definicion` | texto con `$…$`                | Párrafo corto centrado.                                     |
| `axiomas`    | lista de LaTeX                 | Lista numerada (axiomas, propiedades).                      |
| `pasos`      | lista de textos con `$…$`      | Lista numerada (para métodos).                              |
| `grafico`    | objeto gráfico                 | Dibujo vectorial (sección 3).                               |
| `nota`       | texto con `$…$`                | Aclaración chica al pie.                                    |

**Qué usar según el tipo:**

- `teorema` → `hipotesis` + `tesis` (+ `grafico` si ayuda).
- `formula` → `formula` y/o `variantes`.
- `definicion` → `formula`, o `definicion` en texto, o `hipotesis` + `tesis` para un "si y solo si".
- `estructura` → `definicion` + `axiomas`.
- `propiedad` → `axiomas` (una propiedad por línea) o `formula`.
- `metodo` → `formula` + `pasos`.

### 2.2 Dorso

Todo opcional. Se muestra siempre en este orden:

| Campo               | Tipo                                         | Sección                     |
| ------------------- | -------------------------------------------- | --------------------------- |
| `en_cristiano`      | texto                                        | "En cristiano" (destacada)  |
| `requisitos`        | lista de textos                              | "Qué hace falta" (✓)        |
| `cuando_usarlo`     | texto                                        | "Cuándo usarlo"             |
| `idea_demostracion` | texto                                        | "Idea de la demostración"   |
| `ejemplos`          | lista de `{ enunciado, pasos?, resultado? }` | "Ejemplos"                  |
| `errores_comunes`   | lista de textos                              | "Errores comunes" (✕)       |
| `extra`             | lista de `{ titulo, texto }`                 | Secciones libres            |
| `relacionadas`      | lista de ids de cartas                       | Botones para saltar         |

`relacionadas` busca primero en el mismo mazo y después en toda la biblioteca.

---

## 3. Gráficos

```json
"grafico": {
  "x": [-0.6, 4.6],
  "y": [-1.6, 1.6],
  "ejes": true,
  "cuadricula": false,
  "etiquetas_ejes": ["x", "y"],
  "elementos": [
    { "tipo": "funcion", "expr": "1.2*sin(0.9*(x-2.2))", "dominio": [0.4, 4] },
    { "tipo": "punto", "x": 2.2, "y": 0, "hueco": true, "etiqueta": "c" }
  ]
}
```

- `x`, `y`: ventana visible `[mínimo, máximo]`. Obligatorios.
- `ejes` (por defecto `true`), `cuadricula` (por defecto `false`), `etiquetas_ejes` (`["", ""]` para ocultarlas).
- `color` en cualquier elemento: `"cian"`, `"rosa"`, `"tenue"` o `"claro"`.
- `etiqueta` en cualquier elemento: texto corto; admite `$…$`.

| `tipo`        | Campos                                                              |
| ------------- | ------------------------------------------------------------------- |
| `funcion`     | `expr` (en `x`), `dominio?` `[a,b]`, `discontinua?`                 |
| `parametrica` | `x`, `y` (expresiones en `t`), `t` `[t0,t1]`, `discontinua?`        |
| `punto`       | `x`, `y`, `hueco?` (círculo vacío)                                  |
| `segmento`    | `desde` `[x,y]`, `hasta` `[x,y]`, `discontinua?`                    |
| `vector`      | `desde?` (por defecto el origen), `hasta` `[x,y]` — con flecha     |
| `recta_v`     | `x` — recta vertical punteada                                       |
| `recta_h`     | `y` — recta horizontal punteada                                     |
| `region`      | `superior` (expr en `x`), `inferior?` (por defecto `0`), `dominio`  |
| `poligonal`   | `puntos` `[[x,y], …]`, `cerrada?`, `discontinua?`                   |
| `texto`       | `x`, `y`, `texto`                                                    |

### Sintaxis de las expresiones

No es LaTeX: es notación de calculadora.

- Operadores: `+ - * / ^` y paréntesis. `2x`, `3(x+1)` y `x(x-1)` se entienden como productos.
- Constantes: `pi`, `e`.
- Funciones: `sin cos tan asin acos atan sinh cosh tanh exp ln log` (base 10) `log2 sqrt cbrt abs floor ceil round sign min max pow`.
- Decimales con **punto** (`0.5`), nunca con coma.

✅ `0.5*x^2 - 2x + 1` · `sqrt(4 - x^2)` · `exp(-x^2/2)` · `abs(x)`
❌ `\frac{1}{x}` (eso es LaTeX) · `x²` · `0,5`

Consejo: elegí la ventana `x`/`y` de modo que lo importante quede centrado, y calculá los puntos marcados con la misma fórmula de la curva.

---

## 4. LaTeX dentro del JSON

- En JSON la barra invertida se escribe **doble**: `\\frac{a}{b}`, `\\lim_{x \\to 0}`, `\\mathbb{R}`.
- Los saltos de fila en matrices son `\\\\` (cuatro barras en el JSON).
- Campos de **LaTeX puro** (sin `$`): `hipotesis`, `tesis`, `formula`, `variantes[].latex`, `axiomas`.
- Campos de **texto** (prosa con `$…$` en línea y `$$…$$` en bloque): `definicion`, `nota`, `pasos` y todo el dorso.
- En texto, `**palabra**` se muestra en negrita. Para un signo pesos literal: `\\$`.
- Texto dentro de LaTeX: `\\text{ si }`.
- Se renderiza con KaTeX: sirven `cases`, `pmatrix`, `vmatrix`, `aligned`, `\\operatorname`, `\\mathbb`, etc.

---

## 5. Ejemplo completo de un mazo

```json
{
  "formato": "theoremath@1",
  "id": "derivadas",
  "titulo": "Derivadas y Extremos",
  "subtitulo": "Rolle, Valor Medio y L'Hôpital",
  "sigla": "B",
  "dentro_de": "analisis-matematico",
  "cartas": [
    {
      "id": "rolle",
      "tipo": "teorema",
      "titulo": "Teorema de Rolle",
      "subtitulo": "Si empieza y termina igual, en algún lado la pendiente es cero",
      "etiquetas": ["derivada"],
      "frente": {
        "hipotesis": ["f \\in C[a,b]", "f \\text{ derivable en } (a,b)", "f(a) = f(b)"],
        "tesis": "\\exists\\, c \\in (a,b) : f'(c) = 0",
        "grafico": {
          "x": [-0.3, 4.6],
          "y": [-0.4, 2.6],
          "elementos": [
            { "tipo": "funcion", "expr": "0.6 + 1.4*sin(pi*(x-0.5)/3.5)", "dominio": [0.5, 4] },
            { "tipo": "punto", "x": 0.5, "y": 0.6, "color": "rosa", "etiqueta": "a" },
            { "tipo": "punto", "x": 4, "y": 0.6, "color": "rosa", "etiqueta": "b" },
            { "tipo": "segmento", "desde": [1.5, 2], "hasta": [3, 2], "color": "rosa" },
            { "tipo": "punto", "x": 2.25, "y": 2, "hueco": true, "color": "claro", "etiqueta": "c" }
          ]
        }
      },
      "dorso": {
        "en_cristiano": "Si salís de tu casa y volvés a tu casa, en algún momento estuviste quieto o pegaste la vuelta.",
        "requisitos": ["Continua en el cerrado $[a,b]$.", "Derivable en el abierto $(a,b)$.", "Mismo valor en los extremos."],
        "idea_demostracion": "Por Weierstrass hay máximo y mínimo; si alguno está adentro, Fermat da $f'(c)=0$.",
        "ejemplos": [
          {
            "enunciado": "Verificar Rolle para $f(x) = x^2 - 4x$ en $[0,4]$.",
            "pasos": ["$f(0) = 0 = f(4)$.", "$f'(x) = 2x - 4 = 0 \\Rightarrow x = 2$."],
            "resultado": "$c = 2$"
          }
        ],
        "errores_comunes": ["Aplicarlo a $|x|$ en $[-1,1]$: no es derivable en $0$."],
        "relacionadas": ["valor-medio"]
      }
    }
  ]
}
```

---

## 6. Cómo cargarlo en la app

1. En **Cuadernos** tocá **+**.
2. **Archivos .json o .zip**: elegí uno o varios `.json`, o un `.zip` con carpetas.
3. **Desde un link**: pegá el link a un `.json`/`.zip` público, a un archivo de GitHub o a una **carpeta de GitHub** (`https://github.com/usuario/repo/tree/main/carpeta`). Lo importado por link se puede **actualizar** después desde el menú `⋯` de la ficha.
4. Si algo está mal, la app importa lo que sirve y lista los avisos (archivo, carta y campo). Copiá esos avisos y pasáselos a la IA para que lo corrija.

Para compartir un mazo con alguien: `https://<la-app>/#/importar?url=<link-al-json>`.
