/**
 * Image utilities for cropping with PNG transparency support
 */

export interface ImageInfo {
  hasTransparency: boolean;
  width: number;
  height: number;
  format: 'png' | 'jpeg' | 'webp' | 'gif' | 'unknown';
}

/**
 * Detect if an image has transparency by checking alpha channel
 */
export async function detectImageTransparency(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(false);
        return;
      }

      // Sample a smaller version for performance
      const sampleSize = Math.min(100, img.width, img.height);
      canvas.width = sampleSize;
      canvas.height = sampleSize;

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

      try {
        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        // Check alpha channel (every 4th value starting at index 3)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      } catch (e) {
        // CORS or other error - assume no transparency
        resolve(false);
      }
    };

    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
}

/**
 * Get image format from URL or data URL
 */
export function getImageFormat(url: string): ImageInfo['format'] {
  const lower = url.toLowerCase();

  if (lower.includes('data:image/png') || lower.endsWith('.png')) {
    return 'png';
  }
  if (lower.includes('data:image/jpeg') || lower.includes('data:image/jpg') ||
      lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return 'jpeg';
  }
  if (lower.includes('data:image/webp') || lower.endsWith('.webp')) {
    return 'webp';
  }
  if (lower.includes('data:image/gif') || lower.endsWith('.gif')) {
    return 'gif';
  }

  return 'unknown';
}

/**
 * Analyze image and return info about it
 */
export async function analyzeImage(imageUrl: string): Promise<ImageInfo> {
  const format = getImageFormat(imageUrl);
  const hasTransparency = await detectImageTransparency(imageUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      resolve({
        hasTransparency,
        width: img.width,
        height: img.height,
        format,
      });
    };

    img.onerror = () => {
      resolve({
        hasTransparency: false,
        width: 0,
        height: 0,
        format,
      });
    };

    img.src = imageUrl;
  });
}

/**
 * Crop image with transparency support
 */
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CropOptions {
  crop: CropArea;
  outputWidth?: number;
  outputHeight?: number;
  outputFormat?: 'png' | 'jpeg' | 'auto';
  quality?: number; // 0-1 for JPEG
}

export async function cropImage(
  imageUrl: string,
  options: CropOptions
): Promise<string> {
  const { crop, outputWidth, outputHeight, outputFormat = 'auto', quality = 0.92 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set output dimensions
      const finalWidth = outputWidth || crop.width;
      const finalHeight = outputHeight || crop.height;

      canvas.width = finalWidth;
      canvas.height = finalHeight;

      // Draw cropped area
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        finalWidth,
        finalHeight
      );

      // Determine output format
      let format: 'png' | 'jpeg' = 'jpeg';

      if (outputFormat === 'png') {
        format = 'png';
      } else if (outputFormat === 'auto') {
        // Check if image has transparency
        const hasTransparency = await detectImageTransparency(imageUrl);
        format = hasTransparency ? 'png' : 'jpeg';
      }

      // Export
      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? quality : undefined);

      resolve(dataUrl);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Convert File to data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Convert data URL to File
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  const extension = dataUrl.includes('image/png') ? '.png' : '.jpg';
  const finalFilename = filename.includes('.') ? filename : `${filename}${extension}`;

  return new File([blob], finalFilename, { type: blob.type });
}
