/**
 * Documents and data behind Pulsar's thresholds and simulation.
 * Thresholds cite them by id; the About page lists them all.
 */
export interface Source {
  /** Short citation shown next to a threshold. */
  short: string;
  /** Full reference. */
  title: string;
  url?: string;
}

export const SOURCES = {
  'nasa-std-3001-v1': {
    short: 'NASA-STD-3001 Vol. 1',
    title: 'NASA Space Flight Human-System Standard, Volume 1: Crew Health (NASA-STD-3001).',
    url: 'https://www.nasa.gov/ofo/chief-health-medical-officer/nasa-space-flight-human-system-standard/',
  },
  'ochmo-tb-020': {
    short: 'NASA OCHMO-TB-020',
    title:
      'NASA-STD-3001 Technical Brief: Design for Ionizing Radiation Protection (OCHMO-TB-020, Rev E, 2022). Requirements [V1 4029] ALARA, [V1 4030] career limit 600 mSv, [V2 6099] space weather monitoring, [V2 6100] ionizing radiation alerting.',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/radiation-protection-technical-brief-ochmo.pdf',
  },
  'ochmo-tb-003': {
    short: 'NASA OCHMO-TB-003',
    title:
      'NASA-STD-3001 Technical Brief: Habitable Atmosphere (OCHMO-TB-003, Rev A, 2023). Hypoxia symptoms; crews don oxygen masks at the first symptoms.',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-003-habitable-atmosphere.pdf',
  },
  'ochmo-sleep': {
    short: 'NASA Sleep Tech. Brief',
    title:
      'NASA-STD-3001 Technical Brief: Sleep Accommodations (Rev A, 2021). Adults need 7–9 h of sleep (National Sleep Foundation, AASM); astronauts average about 6 h in space; after seven days of six hours of sleep, performance equals 24–36 h without sleep.',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf',
  },
  'ochmo-tb-031': {
    short: 'NASA OCHMO-TB-031',
    title:
      'NASA-STD-3001 Technical Brief: Exercise Overview (OCHMO-TB-031, 2023). In-flight prescription: ~30 min of interval or steady-state aerobic exercise and 30–60 min of load-bearing resistive training; [V1 4003] aerobic capacity, [V1 4024] muscle strength and [V1 4027] bone density must be maintained.',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-031-exercise-overview.pdf',
  },
  'ochmo-tb-016': {
    short: 'NASA OCHMO-TB-016',
    title:
      'NASA-STD-3001 Technical Brief: Behavioral Health and Performance (OCHMO-TB-016, Rev B, 2023). Missions beyond 6 months or beyond low Earth orbit need minimally obtrusive measures of psychological and behavioral state; [V1 6004] behavioral health support, [V1 6010] private psychological conferences (PPCs).',
    url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-016-behavioral-health.pdf',
  },
  'donki': {
    short: 'NASA DONKI',
    title:
      'NASA Space Weather Database Of Notifications, Knowledge, Information (DONKI), Community Coordinated Modeling Center: coronal mass ejections with WSA-ENLIL arrival forecasts (including Mars), solar energetic particle events, geomagnetic storms and interplanetary shocks. Accessed through api.nasa.gov.',
    url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  'hrr': {
    short: 'NASA Human Research Roadmap',
    title:
      'NASA Human Research Program, Human Research Roadmap: risks of sleep loss and circadian desynchronization, reduced aerobic capacity, muscle and bone loss, cardiovascular adaptations, and space radiation (including acute radiation syndromes from solar particle events).',
    url: 'https://humanresearchroadmap.nasa.gov',
  },
  'who-oximetry-2011': {
    short: 'WHO 2011',
    title:
      'World Health Organization, Pulse Oximetry Training Manual (2011): adult heart rate 50–100 bpm; SpO₂ should be 95% or above; at 94% or lower the patient is hypoxic and needs to be treated quickly; below 90% is a clinical emergency.',
    url: 'https://cdn.who.int/media/docs/default-source/patient-safety/pulse-oximetry/who-ps-pulse-oxymetry-training-manual-en.pdf',
  },
  'acc-aha-2017': {
    short: 'ACC/AHA 2017',
    title:
      'Whelton PK et al. 2017 ACC/AHA Guideline for the Prevention, Detection, Evaluation, and Management of High Blood Pressure in Adults. Hypertension 2018;71:e13–e115. Normal <120/<80, elevated 120–129/<80, stage 1 130–139 or 80–89, stage 2 ≥140 or ≥90; hypertensive crisis >180 and/or >120 mmHg.',
    url: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
  },
  'acsm': {
    short: 'ACSM',
    title:
      "American College of Sports Medicine, ACSM's Guidelines for Exercise Testing and Prescription: near-maximal intensity at ≥96% of maximum heart rate; stop exercise if systolic pressure exceeds 250 mmHg or diastolic exceeds 115 mmHg.",
  },
  'tanaka-2001': {
    short: 'Tanaka 2001',
    title:
      'Tanaka H, Monahan KD, Seals DR. Age-predicted maximal heart rate revisited. J Am Coll Cardiol 2001;37:153–156. Maximum heart rate ≈ 208 − 0.7 × age.',
  },
  'msl-rad-pds': {
    short: 'MSL RAD (NASA PDS)',
    title:
      'Mars Science Laboratory Radiation Assessment Detector (RAD) Reduced Data Records, MSL-M-RAD-3-RDR-V1.0, NASA Planetary Data System, Planetary Plasma Interactions node. Total dose rate of detector E (plastic, tissue-like), sols 1780–1830 (August–September 2017), averaged by Pulsar every half hour of Mars local time.',
    url: 'https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/',
  },
  'hassler-2014': {
    short: 'Hassler 2014 (RAD)',
    title:
      "Hassler DM et al. Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover. Science 2014;343:1244797. Gale Crater surface: 0.21 ± 0.04 mGy/day absorbed dose, 0.64 ± 0.12 mSv/day dose equivalent.",
    url: 'https://doi.org/10.1126/science.1244797',
  },
  'zeitlin-2013': {
    short: 'Zeitlin 2013 (RAD)',
    title:
      'Zeitlin C et al. Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory. Science 2013;340:1080–1084. Cruise dose equivalent: 1.84 ± 0.33 mSv/day.',
    url: 'https://doi.org/10.1126/science.1235989',
  },
  'rafkin-2014': {
    short: 'Rafkin 2014 (RAD)',
    title:
      'Rafkin SCR et al. Diurnal variations of energetic particle radiation at the surface of Mars as observed by the Mars Science Laboratory Radiation Assessment Detector. J Geophys Res Planets 2014;119.',
  },
  'jpl-approx-pos': {
    short: 'NASA JPL SSD',
    title:
      'Standish EM. Keplerian Elements for Approximate Positions of the Major Planets (NASA Jet Propulsion Laboratory, Solar System Dynamics), Table 1, valid 1800–2050. Pulsar computes the Earth–Mars distance and the signal delay of the day from them.',
    url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html',
  },
  'mars24': {
    short: 'NASA GISS Mars24',
    title: 'Allison M, McEwen M. Mars24 Sunclock: algorithm and worked examples (NASA Goddard Institute for Space Studies).',
    url: 'https://www.giss.nasa.gov/tools/mars24/help/algorithm.html',
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;
