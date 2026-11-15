# Pulsar

**Health self-monitoring for astronauts on long-duration missions.**
NASA Space Apps Challenge 2026 · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions* · Team CataCody (Uruguay).

> **Prototype – not for medical use.**

On the way to Mars, help can be up to 20 minutes away, so astronauts have to notice health changes themselves. Pulsar answers two questions on one screen: **"Am I OK?"** and **"What do I do now?"**

**Live app:** https://pulsar.catacody.com · **About, thresholds and references:** https://pulsar.catacody.com/about · **Demo video (29 s):** https://youtu.be/yOTw-MYNs4k (also at https://pulsar.catacody.com/demo.mp4)

Built during the hackathon (14–15 November 2026), in stages (see `PLAN.md`, in Spanish). Demo script: `DEMO.md` (in Spanish).

## What it does

- **The whole crew at a glance**: four crew members, each with their status, what they are doing and their most urgent alert; open one to see their full panel.
- **Am I OK?** One overall answer (*All good / Attention / Act now*) from seven indicators: heart rate, SpO₂, blood pressure, radiation, sleep, exercise and wellbeing. Every threshold cites its source (NASA-STD-3001 technical briefs, WHO, ACC/AHA, ACSM); where a cut-off is Pulsar's own choice, the app says so.
- **What do I do now?** Each alert comes with concrete steps the crew can take without waiting for Earth: put on an oxygen mask, go to the storm shelter, stop exercising, talk to the crew medical officer, ask for a private psychological conference…
- **Sign in with your face**: each crew member changes only their own check-in and actions; everyone sees everyone. The face is read on the device (face-api.js): the picture never leaves it, only 128 numbers that describe it.
- **Mark as done**: each crew member marks the action of an alert as done, and the whole crew sees who is acting.
- **Trends** over 24 hours and 7 days with the normal range marked, on Mars local time.
- **Daily wellbeing check-in**: four questions, under a minute.
- **Real radiation from Mars**: the habitat sits in Gale Crater and its dose rate is the one NASA's Curiosity rover measured there with its RAD instrument.
- **Far from Earth**: today's signal delay between the habitat and mission control (from NASA JPL planet positions), so the crew knows how soon an answer can arrive. A **mission control** view (`/earth`) sees the crew one signal delay late and receives a health report from the habitat every 6 Mars hours, downloadable as a PDF.
- **Real space weather**: coronal mass ejections forecast to reach Mars, solar particle events and geomagnetic storms from NASA DONKI, with a heads-up before a CME arrives.
- **English and Spanish** (ES/EN in the header; it starts in English and remembers the language you pick).
- **Works offline and installs** like an app on phones, tablets and computers (a service worker keeps the app; the habitat data and pending changes stay on the device).
- **Demo scenarios** (outside the astronaut's interface): a real solar storm (the event of 10 September 2017, as RAD measured it), low cabin oxygen, fever, a sleepless night, missed workouts and feeling isolated. They can be shared as links, e.g. https://pulsar.catacody.com/?scenario=solar-storm

Vital signs come from a deterministic simulator (the same data on every device); radiation and space weather are real NASA data.

## NASA data and documents

| Resource | How Pulsar uses it |
|---|---|
| [MSL RAD, NASA PDS PPI](https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/) | Dose rate of Curiosity's tissue-like detector at Gale Crater, sols 1780–1830 (Aug–Sep 2017): background and the solar particle event of 10 Sep 2017 |
| [DONKI](https://kauai.ccmc.gsfc.nasa.gov/DONKI/) via [api.nasa.gov](https://api.nasa.gov) | CMEs (with WSA-ENLIL arrival forecasts at Mars), SEPs, geomagnetic storms and interplanetary shocks |
| [NASA-STD-3001](https://www.nasa.gov/ofo/chief-health-medical-officer/nasa-space-flight-human-system-standard/) and its technical briefs | Thresholds and actions: radiation (OCHMO-TB-020), atmosphere (TB-003), sleep, exercise (TB-031), behavioral health (TB-016) |
| [Human Research Roadmap](https://humanresearchroadmap.nasa.gov) | The spaceflight health risks behind each indicator |
| [Mars24](https://www.giss.nasa.gov/tools/mars24/help/algorithm.html) (NASA GISS) | Mission sol and local mean solar time at Gale Crater |
| [Approximate planet positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html) (NASA JPL SSD) | Earth–Mars distance and the signal delay of the day |

The full list of references is on the app's About page.

## How it is built

- A React app; thresholds, recommendation texts and simulator parameters live in `src/config/`, pure logic with unit tests in `src/logic/`.
- **The habitat server** (`server/`): a dependency-free Node server that would sit on the habitat's local network. It keeps the crew's data (check-ins and actions marked as done) in a JSON file, matches faces against the enrolled ones and checks that each change comes from that crew member's sign-in. It pushes every change live to all devices (server-sent events), so every tablet and phone sees the same and nothing is lost if one breaks. While a device is offline its changes wait on it and are sent when the server is back.
- Nginx serves the app, passes `/api/` to the habitat server and proxies DONKI adding the NASA API key, so the key never reaches the browser; DONKI responses are cached for an hour.
- Data pipelines, kept in the repo with their outputs:
  - `scripts/rad/fetch.sh 1780 1830` streams the RAD files from the PDS (~86 MB per sol) and keeps one line per observation in `scripts/rad/raw/`; `node scripts/rad/build.mjs` averages them every half hour of Mars local time into `src/data/radGale.json`.
  - `node scripts/donki/snapshot.mjs` saves DONKI's record of September 2017 to `src/data/donkiSep2017.json`, used by the storm replay and the tests.

## Development

Requires Node 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 (DONKI needs the server proxy; the rest works locally)
npm run server     # the habitat server on :8080 (Vite passes /api to it); data in ./data/
npm test           # unit tests (Vitest)
npm run build      # type-check + production build: the app in dist/, the habitat server in dist-server/
```

## Stack

React 19, TypeScript, Vite 6, Tailwind CSS 3, Vitest; the habitat server uses only Node's standard library. Charts are hand-made SVG.

## License

Pulsar is released under the [Apache License 2.0](LICENSE), the default license of the NASA Space Apps Challenge for original content.

Third-party software used to build it, all under OSI-approved licenses: React, Vite, Tailwind CSS, PostCSS, Autoprefixer, Vitest, jsPDF and its dependencies (MIT; DOMPurify, MPL-2.0 or Apache-2.0) and face-api.js with its models (`@vladmandic/face-api`, MIT; it bundles TensorFlow.js, Apache-2.0), and TypeScript (Apache-2.0). NASA data are public; their sources are listed above and in the app's About page.

The demo video is a screen recording of the app, scripted and edited with AI assistance (Claude, by Anthropic). Its narration is an AI-generated voice made with [Piper TTS](https://github.com/rhasspy/piper) (MIT), voice `es_AR-daniela-high`, trained on [OpenSLR SLR61](https://www.openslr.org/61/) (CC BY-SA 4.0); the video carries a visible "AI-generated voice" mark and English subtitles.
