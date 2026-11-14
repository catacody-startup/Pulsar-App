# Pulsar — plan por etapas

Pulsar se empezó de cero el sábado 14/11/2026, durante la hackatón. La entrega cierra el domingo 15/11 a las 23:59 (hora de Uruguay).

Reglas de trabajo:

- **Un commit = un feature.** Cada commit deja la app andando, con tests, y se entiende solo por su mensaje.
- Desde el primer deploy, cada feature terminado se publica en https://pulsar.catacody.com.

## Etapa 0 — Base ✅

Vite + React + TypeScript + Tailwind + Vitest. README, este plan y la guía para agentes. Logo (`public/pulsar.svg` y PNG), licencia Apache 2.0 e infra: publicada en https://pulsar.catacody.com con `bash /root/services/app-pulsar/scripts/deploy.sh`.

## Etapa 1 — Núcleo del brief y datos de NASA

Responde "¿estoy bien?" y "¿qué hago ahora?" para un astronauta en Marte. Un commit por feature, en este orden:

1. ✅ **Tripulante simulado:** modelo de datos y simulador determinista (lecturas cada minuto, historia de 7 días). El hábitat está en el cráter Gale (donde mide el RAD) y el día sigue la hora solar local de Marte (algoritmo Mars24); el simulador acepta eventos (tormenta solar, falta de oxígeno, enfermedad, noche sin dormir) para las demos.
2. ✅ **Umbrales con fuente y semáforo por indicador:** frecuencia cardíaca, SpO₂, presión, radiación, sueño y ejercicio. Cada umbral cita de dónde sale (NASA-STD-3001 y sus technical briefs, Human Research Roadmap, OMS, ACC/AHA, ACSM); cuando un corte es decisión de Pulsar, la regla lo dice (`basis` en `src/config/thresholds.ts`).
3. ✅ **Panel "¿estoy bien?":** estado general (*All good / Attention / Act now*) y una tarjeta por indicador. La de radiación suma la dosis estimada de la misión (crucero + superficie, medidas del RAD) contra el límite de carrera de 600 mSv.
4. ✅ **Escenarios para la demo:** un selector (fuera de la interfaz del astronauta) inyecta eventos al simulador: tormenta solar, falta de oxígeno en la cabina, fiebre, noche sin dormir y entrenamientos salteados. Queda en la URL (`?scenario=solar-storm`) para compartir la demo con un link.
5. ✅ **Alertas con una acción concreta** cada una: sección *What do I do now?* con pasos que la tripulación puede hacer sin esperar a la Tierra (textos en `src/config/actions.ts`, con fuente cuando la hay). Sin alertas, muestra lo próximo del plan del sol.
6. ✅ **Tendencias** de 24 h y 7 días, con el rango normal marcado: líneas para los signos vitales y la radiación (promedios de 10 o 60 min, eje en hora local de Marte o por sol) y barras por sol para sueño y ejercicio, con tooltip (mouse o flechas del teclado) y mínimo, promedio y máximo a la vista. SVG propio, sin librerías.
7. ✅ **Check-in diario** de bienestar (ánimo, estrés, sueño, aislamiento): cuatro preguntas de 1 a 5 que alimentan el indicador *Wellbeing* (bajo una vez = atención, dos soles seguidos = actuar ya, con PPC como acción). NASA pide medidas poco invasivas del estado psicológico en misiones de más de 6 meses o más allá de la órbita baja (OCHMO-TB-016). Los soles pasados traen check-ins simulados; el de hoy lo contesta el usuario y por ahora queda en el navegador (en la etapa 2 pasa al servidor del hábitat). Escenario nuevo: *Feeling isolated*.
8. ✅ **Dosis real de Marte:** las series del RAD de Curiosity (PDS) alimentan la radiación del simulador, en vez de una cifra fija. Soles 1780–1830 (agosto–septiembre 2017) del dataset MSL-M-RAD-3-RDR-V1.0, detector E (parecido al tejido), en promedios de media hora marciana (`scripts/rad/`: `fetch.sh` baja y extrae, `build.mjs` arma `src/data/radGale.json`). El sol y la hora local de cada observación salen de su hora UTC con Mars24, como en la app: la hora marciana que trae el archivo del RAD no sigue la hora solar media de Gale. Cada sol del hábitat repite uno de los soles tranquilos (1780–1810) a la misma hora local; el fondo medido (≈11,2 µGy/h) es la línea base de los umbrales. El escenario *Solar storm* ahora repite el evento real del 10/9/2017, que en Gale arranca a las 15:30 UTC junto con la fulguración X8.2 (pico ≈24 µGy/h, 2,2× el fondo) y en los datos se ve después el descenso Forbush.
9. ✅ **Tormentas solares reales (DONKI):** eventos de partículas solares (SEP), tormentas geomagnéticas (GST), eyecciones de masa coronal (CME) y choques interplanetarios (IPS) de los últimos 30 días, en vivo por el proxy de Nginx (`/api/donki/…`, key en el servidor, caché de 1 h que sirve la copia vieja si la API corta). Las CME con llegada pronosticada a Marte (modelo WSA-ENLIL) se marcan y, si llegan en menos de 72 h, *What do I do now?* muestra un aviso. En el escenario *Solar storm* el panel muestra el registro de DONKI de esos días con el reloj en el momento equivalente de 2017: la fulguración X8.2 y la CME de 2650 km/s del 10/9 (llegada a Marte pronosticada para el 13/9, de refilón), las SEP en la Tierra y, en Gale, lo que midió el RAD. Recorte guardado en `src/data/donkiSep2017.json` (`scripts/donki/snapshot.mjs`).
10. ✅ **Página About con References:** qué es Pulsar, qué datos de NASA usa y para qué, la tabla con todos los umbrales (regla, estado, fuente y si el corte es decisión de Pulsar, generada de `src/config/thresholds.ts`) y las referencias completas con link. En `/about` (Nginx ya devuelve `index.html` para cualquier ruta).
11. **(Opcional) Signos vitales calibrados con OSDR**, solo si aparece un dataset con signos vitales de astronautas que sirva.

Infra aparte, en `_docker_infra`: ✅ el proxy de DONKI en el Nginx de `app-pulsar`, con la key en `app-pulsar/.env` (fuera de git; mientras no esté, `DEMO_KEY`, que tiene pocos pedidos por hora).

## Etapa 2 — Tripulación y servidor del hábitat

Varios tripulantes. Un servidor en la red local del hábitat guarda los datos: cualquier tablet o teléfono los ve, y si se rompe un dispositivo no se pierde nada.

## Etapa 3 — Identificación facial

Cada uno entra con la cara y solo cambia lo suyo (check-in, acciones). Todos ven a todos.

## Etapa 4 — Lejos de la Tierra

Modo *Mars delay* (demora de la señal del día), reporte para control de misión (PDF) y envío periódico a la Tierra.

## Etapa 5 — Pulido

Inglés y español, funciona sin conexión e instalable, guion de la demo.

## Pendientes del equipo

- Pedir la key gratis en https://api.nasa.gov (nombre y mail, llega al instante) y pasarla para DONKI. Hasta entonces, `DEMO_KEY`.
- Confirmar que todo el equipo está registrado en la misma locación.
- Al final: la página del proyecto en inglés y subir el video a YouTube (ver *Video demo*).

## Video demo

Se hace al final, cuando estén los features, y se commitea **una sola vez**, ya terminado (cada versión de un binario queda para siempre en el historial).

- Hasta 30 s. Si se hace con IA, lleva la marca "AI-generated" visible y se declara en *Use of Super Intelligence*.
- El archivo va en `public/demo.mp4`: la app lo sirve en https://pulsar.catacody.com/demo.mp4 y el README lo enlaza. Que pese pocos MB (720p, H.264).
- Además se sube a YouTube (público o no listado) y ese link va en *Link to Project Demo*.
- Si para entonces la app funciona sin conexión, el video no se precarga.

## Recursos de NASA

| Recurso | Cómo se usa | Acceso |
|---|---|---|
| DONKI (SEP, GST, CME) | Tormentas solares reales y riesgo de radiación | API JSON, hasta 60 días por consulta, key gratis en https://api.nasa.gov (`DEMO_KEY` para probar) |
| MSL RAD (Curiosity) | Dosis en la superficie de Marte | Archivos del PDS, nodo PPI: https://pds-ppi.igpp.ucla.edu |
| OSDR | Calibrar signos vitales (opcional) | https://osdr.nasa.gov |
| Human Research Roadmap | Fundamento de umbrales | https://humanresearchroadmap.nasa.gov |
| NASA-STD-3001 | Fundamento de umbrales | https://www.nasa.gov/ofo/chief-health-medical-officer/nasa-space-flight-human-system-standard/ |

## Entrega (reglas de Space Uruguay)

El repo es público desde el 14/11.


- Ventana: del sábado 14/11 a las 9:00 al domingo 15/11 a las 23:59, hora de Uruguay. Hay que apretar **Submit for Judging**: guardar no es enviar. Se puede reenviar y cuenta la última versión.
- Nadie puede empezar el proyecto antes del sábado 14/11 a las 10:15. Al enviar se aceptan los términos de trabajo original.
- Demo: video de hasta 30 s o hasta 7 diapositivas, con link público. Puede ir en español con subtítulos en inglés. Lo hecho con IA lleva la marca "AI-generated" visible.
- Página del proyecto en inglés, con los 8 campos: Project Name, High-Level Project Summary, Link to Project Demo, Link to Final Project, Detailed Project Description, NASA & Space Agency Partner Data, References, Use of Super Intelligence.
- Links públicos, sin login ni contraseña. Usar al menos un recurso de datos de NASA. Declarar el uso de IA.
- Todo el equipo registrado en la misma locación. La participación puede ser toda online.
- Domingo: Llamada 3 a las 10:00, Llamada 4 a las 15:00 (cómo subir el proyecto), guardia en Discord desde las 18:00.
- Criterios del jurado (1 a 5): impacto, creatividad, validez, relevancia y presentación.
