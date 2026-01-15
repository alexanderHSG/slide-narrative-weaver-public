declare global {
  interface ImportMetaEnv {
    VITE_CLOUDINARY_UPLOAD_PRESET: string;
    CLOUDINARY_CLOUD_NAME: string;
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
    VITE_AWS_REGION: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const MAX_ATTEMPTS = 2;

export const uploadCanvasToCloud = async (canvas: HTMLCanvasElement, nodeId: string): Promise<string | null> => {
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!uploadPreset || !cloudName) {
    console.warn('⚠️ Cloudinary environment variables not set, skipping upload');
    return null;
  }

  let attemptCount = 0;
  while (attemptCount < MAX_ATTEMPTS) {
    attemptCount++;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png')
      );
      if (!blob) throw new Error('Canvas toBlob failed');

      const file = new File([blob], `${nodeId}.png`, { type: 'image/png' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('public_id', `slides/${nodeId}`);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

      const data = await response.json();
      return data.secure_url || null;
    } catch (error) {
      console.error(`⚠️ Upload attempt ${attemptCount} for ${nodeId} failed`, error);
      if (attemptCount >= MAX_ATTEMPTS) return null;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return null;
};