/**
 * The mission Pulsar simulates: a crew living in a habitat on the surface of Mars.
 *
 * The habitat sits at Curiosity's landing site in Gale Crater, so the
 * radiation measured there by the rover's RAD instrument applies to it.
 */
export const MISSION = {
  site: {
    name: 'Gale Crater',
    /** Bradbury Landing, Curiosity (MSL). Planetocentric, east longitude positive. */
    latitudeDeg: -4.5895,
    eastLongitudeDeg: 137.4417,
  },
  /** Fictional landing date of the crew; the landing sol is sol 0. */
  landingMs: Date.parse('2026-05-04T00:00:00Z'),
  /** Days of the cruise from Earth to Mars before landing (fictional, a fast transfer). */
  transitDays: 180,
} as const;
