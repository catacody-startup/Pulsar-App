# Pulsar — plan por etapas

Pulsar se empezó de cero el sábado 14/11/2026, durante la hackatón. La entrega cierra el domingo 15/11 a las 23:59 (hora de Uruguay).

Reglas de trabajo:

- **Un commit = un feature.** Cada commit deja la app andando, con tests, y se entiende solo por su mensaje.
- Desde el primer deploy, cada feature terminado se publica en https://pulsar.catacody.com.

## Etapa 0 — Base ✅

Vite + React + TypeScript + Tailwind + Vitest. README, este plan y la guía para agentes.

## Etapa 1 — Núcleo del brief y datos de NASA

Responde "¿estoy bien?" y "¿qué hago ahora?" para un astronauta en Marte. Un commit por feature, en este orden:

1. **Tripulante simulado:** modelo de datos y simulador determinista (lecturas cada minuto, historia de 7 días).
2. **Umbrales con fuente y semáforo por indicador:** frecuencia cardíaca, SpO₂, presión, radiación, sueño y ejercicio. Cada umbral cita de dónde sale (NASA-STD-3001, Human Research Roadmap).
3. **Panel "¿estoy bien?":** estado general (*All good / Attention / Act now*) y una tarjeta por indicador.
4. **Alertas con una acción concreta** cada una.
5. **Tendencias** de 24 h y 7 días, con el rango normal marcado.
6. **Check-in diario** de bienestar (ánimo, estrés, sueño, aislamiento).
7. **Dosis real de Marte:** las series del RAD de Curiosity (PDS) alimentan la radiación del simulador, en vez de una cifra fija.
8. **Tormentas solares reales (DONKI):** eventos de partículas solares (SEP), tormentas geomagnéticas (GST) y eyecciones de masa coronal (CME). La key queda en el servidor (proxy de Nginx con caché), nunca en el navegador. Para la demo, se reproduce un evento histórico fuerte.
9. **Página About con References:** fuentes de datos y documentos.
10. **(Opcional) Signos vitales calibrados con OSDR**, solo si aparece un dataset con signos vitales de astronautas que sirva.

Infra aparte, en `_docker_infra`: Nginx en `app-pulsar`, proxy de DONKI y deploy con tests + build en Docker.

## Etapa 2 — Tripulación y servidor del hábitat

Varios tripulantes. Un servidor en la red local del hábitat guarda los datos: cualquier tablet o teléfono los ve, y si se rompe un dispositivo no se pierde nada.

## Etapa 3 — Identificación facial

Cada uno entra con la cara y solo cambia lo suyo (check-in, acciones). Todos ven a todos.

## Etapa 4 — Lejos de la Tierra

Modo *Mars delay* (demora de la señal del día), reporte para control de misión (PDF) y envío periódico a la Tierra.

## Etapa 5 — Pulido

Inglés y español, funciona sin conexión e instalable, guion de la demo.

## Recursos de NASA

| Recurso | Cómo se usa | Acceso |
|---|---|---|
| DONKI (SEP, GST, CME) | Tormentas solares reales y riesgo de radiación | API JSON, hasta 60 días por consulta, key gratis en https://api.nasa.gov (`DEMO_KEY` para probar) |
| MSL RAD (Curiosity) | Dosis en la superficie de Marte | Archivos del PDS, nodo PPI: https://pds-ppi.igpp.ucla.edu |
| OSDR | Calibrar signos vitales (opcional) | https://osdr.nasa.gov |
| Human Research Roadmap | Fundamento de umbrales | https://humanresearchroadmap.nasa.gov |
| NASA-STD-3001 | Fundamento de umbrales | https://www.nasa.gov/ofo/chief-health-medical-officer/nasa-space-flight-human-system-standard/ |

## Entrega (reglas de Space Uruguay)

- Ventana: del sábado 14/11 a las 9:00 al domingo 15/11 a las 23:59, hora de Uruguay. Hay que apretar **Submit for Judging**: guardar no es enviar. Se puede reenviar y cuenta la última versión.
- Nadie puede empezar el proyecto antes del sábado 14/11 a las 10:15. Al enviar se aceptan los términos de trabajo original.
- Demo: video de hasta 30 s o hasta 7 diapositivas, con link público. Puede ir en español con subtítulos en inglés. Lo hecho con IA lleva la marca "AI-generated" visible.
- Página del proyecto en inglés, con los 8 campos: Project Name, High-Level Project Summary, Link to Project Demo, Link to Final Project, Detailed Project Description, NASA & Space Agency Partner Data, References, Use of Super Intelligence.
- Links públicos, sin login ni contraseña. Usar al menos un recurso de datos de NASA. Declarar el uso de IA.
- Todo el equipo registrado en la misma locación. La participación puede ser toda online.
- Domingo: Llamada 3 a las 10:00, Llamada 4 a las 15:00 (cómo subir el proyecto), guardia en Discord desde las 18:00.
- Criterios del jurado (1 a 5): impacto, creatividad, validez, relevancia y presentación.
