# Pulsar — guía para agentes

Leé primero `README.md` y `PLAN.md` (qué etapa está en curso y qué feature sigue).

- App del equipo **CataCody** para el NASA Space Apps Challenge 2026 (14 y 15 de noviembre), desafío *Create Health Monitoring Software for Astronauts on Space Missions*. **Pulsar** es el nombre de la app; CataCody, el del equipo.
- Se escribe de cero desde el 14/11/2026. **Un commit = un feature**, con su mensaje en español.
- Dominio: `pulsar.catacody.com`. Infra en `/root/services/app-pulsar/` (repo `_docker_infra`). Solo rama `main`.
- La interfaz va en inglés (el juzgamiento es global). Commits y documentación interna en español rioplatense.
- Umbrales, textos de recomendaciones y parámetros del simulador viven en `src/config/`; nunca hardcodearlos en los componentes. Cada umbral cita su fuente.
- `src/logic/` son funciones puras con tests: correr `npm test` y `npm run typecheck` antes de commitear.
- La key de la API de NASA nunca va al navegador: la agrega el servidor.
- El host tiene Node 18: por eso Vite 6, Tailwind 3 y Vitest 3 (las versiones nuevas piden Node 20).
- Siempre visible la nota "Prototype – not for medical use".
