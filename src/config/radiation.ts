import radGale from '../data/radGale.json';
import { radMean, type RadSeries } from '../logic/radSeries';

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

/**
 * Dose rate measured by Curiosity's RAD at Gale Crater: half-hour averages of
 * the tissue-like detector E, built from the PDS archive by scripts/rad/.
 */
export const RAD_SERIES: RadSeries = radGale;

/** Curiosity landed at Gale on 6 August 2012 (its sol 0). */
export const CURIOSITY_LANDING_MS = Date.parse('2012-08-06T05:17:57Z');

export const RAD_REPLAY = {
  /**
   * Quiet sols (no solar particle event) that the habitat's background cycles
   * through: each habitat sol replays one of them at the same local time.
   */
  quietSols: { from: 1780, to: 1810 },
  /**
   * Onset of the solar particle event of 10 September 2017 at Gale (Curiosity sol
   * date): the dose starts rising around 06:00 LMST, 15:30 UTC, as the X8.2 flare
   * that launched it began.
   */
  sep2017Onset: 1812 + 6 / 24,
};

/** Normal background: mean dose rate of the quiet sols, µGy/h. */
export const RAD_BACKGROUND_DOSE_RATE = radMean(RAD_SERIES, RAD_REPLAY.quietSols.from, RAD_REPLAY.quietSols.to);
