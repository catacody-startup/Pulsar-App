// Copies the face-api.js models the app uses from node_modules to public/models
// (not in git: they come with the npm package). Runs before dev and build.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const from = join(root, 'node_modules', '@vladmandic', 'face-api', 'model');
const to = join(root, 'public', 'models');
const MODELS = ['tiny_face_detector_model', 'face_landmark_68_model', 'face_recognition_model'];

mkdirSync(to, { recursive: true });
for (const m of MODELS) {
  for (const file of [`${m}-weights_manifest.json`, `${m}.bin`]) copyFileSync(join(from, file), join(to, file));
}
console.log(`face-api.js models → public/models (${MODELS.join(', ')})`);
