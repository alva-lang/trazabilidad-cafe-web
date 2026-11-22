# TrazabilidadCafé · Interfaz web de consulta y registro

Aplicación web (HTML, CSS y JavaScript, sin frameworks) para **consultar el recorrido de un lote de café
escaneando su código QR** y registrar lotes y eventos con las mismas reglas del contrato inteligente
`TrazabilidadCafe.sol` del trabajo del curso de Blockchain.

Proyecto final · Desarrollo Front-End 2026-2 · **Versión 1 (EC2)**. Todos los datos son **ficticios**.

## Problema y usuarios
- **Consultor** (comprador): quiere saber de dónde viene el café y por qué etapas pasó, desde el celular y sin billetera digital.
- **Registrador/administrador** (cooperativa): registra lotes y eventos de forma controlada.

## Requisitos del curso → dónde se cumplen
| Requisito | Dónde |
|---|---|
| HTML semántico, ≥3 vistas | `index.html`: 4 vistas (`header`, `nav`, `main`, `section`, `footer`) |
| CSS propio, coherente | `css/styles.css` (tokens de color, tipografía y espaciado) |
| Responsivo | media queries a 40em y 64em, unidades `rem`/`%`/`fr`, menú móvil |
| Formulario validado con JS | Registrar lote / agregar evento (`js/app.js`, reglas en `js/ledger.js`) |
| Eventos que modifican el DOM | Buscador, filtros por zona y etapa, detalle, bitácora |
| Datos con `fetch` | `data/lotes.json` |
| Accesibilidad básica | `alt`/`aria`, etiquetas, foco visible, skip link, contraste, uso completo con teclado |
| Repositorio con commits | historial en Git |
| Publicación | GitHub Pages (`.github/workflows/pages.yml`) |

## Ejecutar en local
```bash
npm start          # sirve la carpeta en http://localhost:5173
npm test           # pruebas de las reglas de negocio (Node 20+)
npm run datos      # regenera data/lotes.json
```
`fetch` no funciona abriendo `index.html` con doble clic: usa un servidor local.

## Publicar en GitHub Pages
1. Sube el repositorio a GitHub. 2. En *Settings → Pages* elige **GitHub Actions**. 3. Cada `push` a `main` publica.
El código QR usa la dirección donde esté publicada la app.

## Estructura
```
index.html · css/styles.css · js/{app,ledger,sha256}.js · js/vendor/qrcode.js (MIT)
data/lotes.json · scripts/generar-datos.mjs · tests/ · docs/
```

## Alcance honesto de la v1
El registro corre en el navegador (localStorage) y **no** se conecta aún a una blockchain. La integridad se
muestra con huellas SHA-256 encadenadas; `js/ledger.js` está aislado para sustituirlo por Ethers.js + contrato en una versión posterior.
Que un dato esté bien encadenado no prueba que sea verdadero.

## Evaluación
`docs/auditoria-v1/` contiene los reportes Lighthouse y axe de la v1. El plan de evaluación e instrumentos está en `docs/`.
