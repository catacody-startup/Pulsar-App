/**
 * Mission control on Earth: what it sees of the habitat, and when.
 * Everything arrives one signal delay late (src/logic/planets.ts).
 */
export const MISSION_CONTROL = {
  /** The habitat sends a health report to Earth every this many Mars hours, at whole multiples of it (local time). */
  reportEveryMarsHours: 6,
  /** Reports listed on the mission control page. */
  reportsShown: 4,
};
