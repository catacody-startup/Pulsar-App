/**
 * Reads a face on the device with face-api.js: detection, 68 landmarks and the
 * 128-number descriptor. The library and its models (~7 MB) load only when
 * someone signs in. The picture never leaves the device.
 */
import { FACE } from '../config/face';

type FaceApi = typeof import('@vladmandic/face-api');

let loading: Promise<FaceApi> | null = null;

export function loadFaceApi(): Promise<FaceApi> {
  loading ??= (async () => {
    const faceapi = await import('@vladmandic/face-api');
    // WebGL on the GPU when the device has it; otherwise the CPU (slower, still works).
    const tf = faceapi.tf as unknown as { setBackend(name: string): Promise<boolean>; ready(): Promise<void> };
    if (!(await tf.setBackend('webgl').catch(() => false))) await tf.setBackend('cpu');
    await tf.ready();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE.modelsPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE.modelsPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE.modelsPath),
    ]);
    return faceapi;
  })().catch((e: unknown) => {
    loading = null; // let a later try start over
    throw e;
  });
  return loading;
}

export interface FaceReading {
  /** 128 numbers that describe the face, rounded (that is all that is sent). */
  descriptor: number[];
  /** Detection score, 0–1. */
  score: number;
}

/** The face in the video right now, or null if there is none (or it is not clear enough). */
export async function readFace(video: HTMLVideoElement): Promise<FaceReading | null> {
  const faceapi = await loadFaceApi();
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: FACE.minDetectionScore });
  const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();
  if (!result) return null;
  return {
    descriptor: Array.from(result.descriptor, (x) => Math.round(x * 1e5) / 1e5),
    score: result.detection.score,
  };
}

/** Opens the front camera in `video`. Returns a function that turns it off. */
export async function startCamera(video: HTMLVideoElement): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return () => {
    for (const track of stream.getTracks()) track.stop();
    video.srcObject = null;
  };
}
