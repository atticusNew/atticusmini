/**
 * Downscale + re-encode a user-picked image to a small JPEG data URL, so
 * avatars stay tiny (they live in localStorage). Returns a rejected promise
 * with a human-readable message on invalid input.
 */
export const downscaleImage = (file: File, max = 256): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    if (file.size > 20 * 1024 * 1024) return reject(new Error('That image is too large (max 20MB).'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return reject(new Error('Could not read that image.'));
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL('image/jpeg', 0.85)); } catch { resolve(src); }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
