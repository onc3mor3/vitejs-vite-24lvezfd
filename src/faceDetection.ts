import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;

export async function initializeFaceDetection() {
  if (faceLandmarker) {
    return faceLandmarker;
  }

  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'CPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
  });

  return faceLandmarker;
}

export function detectFace(video: HTMLVideoElement) {
  if (!faceLandmarker) {
    throw new Error('Pendeteksi wajah belum diinisialisasi.');
  }

  return faceLandmarker.detectForVideo(video, performance.now());
}

export function closeFaceDetection() {
  faceLandmarker?.close();
  faceLandmarker = null;
}
