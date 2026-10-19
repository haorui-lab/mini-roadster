import * as THREE from "three";

let gradient: THREE.CanvasTexture | null = null;

export function toonGradient() {
  if (gradient) return gradient;
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(4, 1);
  const tones = [64, 120, 186, 255];
  for (let i = 0; i < 4; i++) {
    image.data[i * 4] = tones[i]!;
    image.data[i * 4 + 1] = tones[i]!;
    image.data[i * 4 + 2] = tones[i]!;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  gradient = new THREE.CanvasTexture(canvas);
  gradient.magFilter = THREE.NearestFilter;
  gradient.minFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  return gradient;
}
