/**
 * Radiation measured by Curiosity's RAD instrument.
 *
 * Gale Crater surface (Hassler et al. 2014, Science 343, doi:10.1126/science.1244797):
 * absorbed dose 0.21 ± 0.04 mGy/day and dose equivalent 0.64 ± 0.12 mSv/day.
 *
 * Cruise from Earth to Mars inside the MSL spacecraft (Zeitlin et al. 2013,
 * Science 340, doi:10.1126/science.1235989): dose equivalent 1.84 ± 0.33 mSv/day.
 */
export const GALE_SURFACE_RADIATION = {
  /** Absorbed dose rate, µGy/h (0.21 mGy per Earth day). */
  absorbedDoseRate: 210 / 24,
  /** Dose equivalent per Earth day, mSv. */
  doseEquivalentPerDay: 0.64,
  /** Mean quality factor: dose equivalent ÷ absorbed dose (0.64 / 0.21). */
  qualityFactor: 0.64 / 0.21,
};

export const CRUISE_RADIATION = {
  /** Dose equivalent per day in transit, mSv. */
  doseEquivalentPerDay: 1.84,
};
