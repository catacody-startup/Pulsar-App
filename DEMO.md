# Pulsar — guion de la demo

Para el video de 30 s y para mostrar la app en vivo. Todo pasa en https://pulsar.catacody.com. La app está en inglés y tiene botón **ES** en la cabecera.

## Antes de presentar

- **Navegador:** Chrome o Edge, en una ventana normal. La ventana privada también funciona, pero no recuerda la sesión.
- **Escenario de arranque:** sin `?scenario=…` (sol normal). El selector *Demo · simulate* cambia de escenario y lo deja en la URL.
- **Cámara:** dar permiso la primera vez. Si no hay cámara, o la plataforma la bloquea, usar *Demo · no camera?* en `/sign-in`.
- **Caras registradas:** se borran a las 2 h sin uso. Si los cuatro lugares están ocupados, entrar con la demo sin cara o esperar.
- **DONKI en vivo:** necesita la key del equipo en `app-pulsar/.env`. Sin ella, el panel en vivo puede decir que DONKI no contesta. La repetición de la tormenta de 2017 anda igual.
- **Segundo dispositivo:** tener abierta la app en un teléfono, en la página de la tripulación, para mostrar que los cambios llegan en vivo.

## Video de 30 s

El texto en pantalla va en inglés. La voz puede ir en español, con subtítulos en inglés. Si se hace con IA, lleva la marca "AI-generated" visible.

| Tiempo | Pantalla | Texto en pantalla |
|---|---|---|
| 0–4 s | Página de la tripulación, sol normal. | *On Mars, help from Earth is up to 20 minutes away.* |
| 4–9 s | Cambiar a *Solar storm (real data)*: los cuatro pasan a **Act now**. | *Real radiation from NASA's Curiosity (RAD), 10 Sep 2017.* |
| 9–15 s | Panel de Lucía: **Am I OK? → Act now** y *What do I do now?* con "take shelter". | *Am I OK? What do I do now?* |
| 15–20 s | Entrar con la cara y tocar *Mark as done*. El teléfono muestra "✓ done" al instante. | *Each astronaut signs in with their face. The whole crew sees who is acting.* |
| 20–26 s | *Mission control*: la tripulación con 11 min de atraso; bajar el PDF. | *Mission control sees the crew one signal delay late.* |
| 26–30 s | Logo y URL. | *Pulsar · pulsar.catacody.com · Prototype – not for medical use* |

## Demo en vivo (2–3 min)

1. **El problema (15 s).** "En Marte, la ayuda de la Tierra puede estar a 20 minutos. Pulsar contesta dos preguntas: ¿estoy bien? y ¿qué hago ahora?"
2. **La tripulación (20 s).** En `/`, cuatro tripulantes con su semáforo, qué están haciendo y su alerta más urgente. Abajo, el hábitat: la radiación real que midió Curiosity en el cráter Gale y el **enlace con la Tierra** (minutos de ida y vuelta de hoy, calculados con las posiciones de planetas del JPL).
3. **Tormenta solar real (40 s).** Elegir *Solar storm (real data)*. La dosis repite lo que midió el RAD el 10/9/2017 (≈2,2× el fondo). En el panel de un tripulante se ven *Act now*, "Solar particle event: take shelter" con pasos concretos, y el recordatorio de que control de misión tarda al menos la ida y vuelta en contestar. El clima espacial muestra lo que registró DONKI esos días: la CME de 2650 km/s con llegada pronosticada a Marte.
4. **Cara y "hecho" (30 s).** *Sign in* → *Start camera*. Si la cara no está registrada, "I'm Lucía" y 3 fotos. Ya adentro, *Mark as done*. En el teléfono, la tarjeta de Lucía dice "✓ done" sin recargar. Aclarar: "La foto no sale del dispositivo; solo viajan 128 números. Cada uno cambia solo lo suyo y todos ven a todos."
5. **Check-in (15 s).** Las cuatro preguntas de bienestar (OCHMO-TB-016 pide medidas poco invasivas del estado psicológico en misiones largas). Con el escenario *Feeling isolated*, dos check-ins bajos piden una conferencia psicológica privada (PPC).
6. **Control de misión (25 s).** En `/earth`, la tripulación como la ve la Tierra: el estado de hace unos 11 minutos. Reportes cada 6 horas marcianas, el que está en viaje y el próximo. Bajar un **PDF**.
7. **Cierre (15 s).** Funciona sin conexión y se instala; inglés y español; *About* lista cada umbral con su fuente (NASA-STD-3001, OMS, ACC/AHA, ACSM) y dice cuándo un corte es decisión nuestra.

## Links para compartir

- Tormenta solar: https://pulsar.catacody.com/?scenario=solar-storm
- Poco oxígeno en la cabina: https://pulsar.catacody.com/?scenario=low-oxygen
- Fiebre (Lucía): https://pulsar.catacody.com/crew/lucia?scenario=fever
- Aislamiento (Lucía): https://pulsar.catacody.com/crew/lucia?scenario=isolation
- Control de misión: https://pulsar.catacody.com/earth
- Fuentes y umbrales: https://pulsar.catacody.com/about

## Qué decir según cada criterio del jurado

- **Impacto:** autonomía de la tripulación cuando la Tierra está lejos; la acción concreta importa más que el número.
- **Creatividad:** reconocimiento facial en el dispositivo, control de misión con la demora real de la señal, la tormenta de 2017 repetida con datos reales.
- **Validez:** cada umbral tiene fuente, y la app dice cuándo un corte es nuestro. Hay 126 tests y la app es un prototipo, no para uso médico.
- **Relevancia:** usa datos de NASA (MSL RAD del PDS, DONKI, Mars24, posiciones de planetas del JPL) y se apoya en NASA-STD-3001 y el Human Research Roadmap.
- **Presentación:** una pantalla con dos preguntas y un semáforo.

## Plan B

- **Sin internet en la sala:** la app instalada abre sin conexión y muestra los últimos datos. Los cambios quedan esperando en el dispositivo.
- **La cámara falla:** usar la demo sin cara.
- **DONKI no contesta:** mostrar el escenario de tormenta, que trae su propio registro de DONKI.
