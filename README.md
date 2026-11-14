# Pulsar

**Health self-monitoring for astronauts on long-duration missions.**
NASA Space Apps Challenge 2026 · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions* · Team CataCody (Uruguay).

> **Prototype – not for medical use.**

On the way to Mars, help can be up to 20 minutes away, so astronauts have to notice health changes themselves. Pulsar answers two questions on every screen: **"Am I OK?"** and **"What do I do now?"**

Work in progress: built during the hackathon (14–15 November 2026), in stages (see `PLAN.md`, in Spanish).

## Development

Requires Node 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run build      # type-check + production build in dist/
```

## Stack

React 19, TypeScript, Vite 6, Tailwind CSS 3, Vitest.
