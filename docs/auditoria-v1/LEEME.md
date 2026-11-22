# Auditoría técnica de la versión 1
Reportes generados sobre la app servida en local (Chromium headless, Lighthouse 12+, axe-core con etiquetas wcag2a, wcag2aa, wcag21a/aa y wcag22aa).
- `lighthouse-{inicio,consultar,registrar}.report.html|json`
- `axe-v1.json`
Los resultados de laboratorio no sustituyen la prueba manual con teclado y lector de pantalla. axe marcó «incompleto» el contraste en el hero (fondo degradado) y en el formulario: se revisa a mano.
Repetir la auditoría sobre la URL pública antes del EC3 y guardar los reportes de la v2 junto a estos.
