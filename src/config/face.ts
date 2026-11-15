/**
 * Face sign-in: each crew member signs in with their face and can change
 * only their own data (check-in, actions done); everyone sees everyone.
 *
 * The face is read on the device with face-api.js (a 128-number descriptor
 * from a ResNet-34 trained like dlib's face recognition model). The picture
 * never leaves the device: only those numbers go to the habitat server, which
 * compares them with the enrolled ones.
 */
export const FACE = {
  /**
   * Two descriptors closer than this (euclidean distance) are the same person.
   * face-api.js and dlib use 0.6 (99.38% on the LFW benchmark); Pulsar is a
   * little stricter so one crew member is not taken for another.
   */
  matchDistance: 0.5,
  /** Descriptor length of the face-api.js recognition model. */
  descriptorLength: 128,
  /** Pictures taken to enroll a face (all kept; the closest one counts). */
  enrollSamples: 3,
  /** Faces are forgotten after this long without signing in (public demo: seats free up). */
  enrollmentTtlHours: 2,
  /** How long a sign-in lasts on a device. */
  sessionHours: 12,
  /** Face checks allowed per client per minute (against guessing). */
  checksPerMinute: 10,
  /** Demo control: sign in as a crew member without a camera (outside the astronaut's interface). */
  demoSignIn: true,
  /** Where the app finds the face-api.js models. */
  modelsPath: '/models',
  /** Smallest detection score accepted for a picture, 0–1. */
  minDetectionScore: 0.6,
};
