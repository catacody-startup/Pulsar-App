/**
 * Radiation on the surface of Gale Crater measured by Curiosity's RAD
 * (Hassler et al. 2014, Science 343, doi:10.1126/science.1244797):
 * absorbed dose 0.21 ± 0.04 mGy/day and dose equivalent 0.64 ± 0.12 mSv/day.
 */
export const GALE_SURFACE_RADIATION = {
  /** Absorbed dose rate, µGy/h (0.21 mGy per Earth day). */
  absorbedDoseRate: 210 / 24,
  /** Mean quality factor: dose equivalent ÷ absorbed dose (0.64 / 0.21). */
  qualityFactor: 0.64 / 0.21,
};
