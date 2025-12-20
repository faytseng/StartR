
import JSZip from 'jszip';

/**
 * Resizes an image to specific dimensions while maintaining aspect ratio (padding or direct scale)
 */
export async function resizeImage(
  dataUrl: string,
  width: number,
  height: number,
  mode: 'contain' | 'stretch' = 'contain'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      if (mode === 'stretch') {
        ctx.drawImage(img, 0, 0, width, height);
      } else {
        // Contain logic with background padding (transparent)
        const ratio = Math.min(width / img.width, height / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        const x = (width - nw) / 2;
        const y = (height - nh) / 2;
        ctx.drawImage(img, x, y, nw, nh);
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

/**
 * Generates and triggers a ZIP download of multiple images
 */
export async function downloadAllImages(images: { url: string; filename: string }[]) {
  const zip = new JSZip();
  const folder = zip.folder("stickers");

  const promises = images.map(async (img) => {
    const response = await fetch(img.url);
    const blob = await response.blob();
    folder?.file(img.filename, blob);
  });

  await Promise.all(promises);
  const content = await zip.generateAsync({ type: "blob" });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = "stickers_all.zip";
  link.click();
}

/**
 * Advanced Green Screen Removal Algorithm
 */
export async function removeBackground(imgSource: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas');
  const w = imgSource.naturalWidth;
  const h = imgSource.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(imgSource, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  // 1. Color distance and HSL detection
  const isGreen = (r: number, g: number, b: number) => {
    // Exact green distance
    const dist = Math.sqrt((r - 0) ** 2 + (g - 255) ** 2 + (b - 0) ** 2);
    if (dist < 20) return true;

    // HSL based logic
    const { h: hue, s, l } = rgbToHsl(r, g, b);
    const isHueGreen = hue >= 60 && hue <= 185;
    const isSatValid = s >= 0.22;
    const isLightValid = l >= 0.12 && l <= 0.95;
    const gHigher = g > r + 10 && g > b + 10;

    return isHueGreen && isSatValid && isLightValid && gHigher;
  };

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i += 4) {
    if (isGreen(data[i], data[i + 1], data[i + 2])) {
      mask[i / 4] = 1;
    }
  }

  // 2. Flood Fill from Borders (Only remove connected green)
  const backgroundMask = floodFillFromBorders(mask, w, h);

  // 3. Apply Alpha and Protections
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    if (backgroundMask[i]) {
      data[idx + 3] = 0; // Transparent
    } else {
      // Spill suppression for near-green pixels
      const r = data[idx], g = data[idx+1], b = data[idx+2];
      if (g > r && g > b) {
        data[idx + 1] = (r + b) / 2; // Reduce green spill
      }
    }
  }

  // 4. White stroke protection & Feathering would go here
  // Simplified feathering for this implementation
  featherAlpha(data, w, h, 1);

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function floodFillFromBorders(mask: Uint8Array, w: number, h: number): Uint8Array {
  const bg = new Uint8Array(w * h);
  const queue: number[] = [];

  const add = (x: number, y: number) => {
    const i = y * w + x;
    if (mask[i] && !bg[i]) {
      bg[i] = 1;
      queue.push(i);
    }
  };

  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
  for (let y = 0; y < h; y++) { add(0, y); add(w - 1, y); }

  while (queue.length > 0) {
    const i = queue.shift()!;
    const x = i % w;
    const y = Math.floor(i / w);
    if (x > 0) add(x - 1, y);
    if (x < w - 1) add(x + 1, y);
    if (y > 0) add(x, y - 1);
    if (y < h - 1) add(x, y + 1);
  }
  return bg;
}

function featherAlpha(data: Uint8ClampedArray, w: number, h: number, radius: number) {
  // Simple alpha smoothing
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      if (data[idx + 3] > 0 && data[idx + 3] < 255) {
        // Average neighbor alphas
        let sum = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            sum += data[((y + dy) * w + (x + dx)) * 4 + 3];
          }
        }
        data[idx + 3] = sum / ((radius * 2 + 1) ** 2);
      }
    }
  }
}
