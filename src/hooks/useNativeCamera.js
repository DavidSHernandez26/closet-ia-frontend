import { Capacitor } from '@capacitor/core';

async function webPathToFile(photo) {
  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const ext = photo.format || 'jpeg';
  const mime = blob.type || `image/${ext}`;
  return new File([blob], `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`, { type: mime });
}

export function useNativeCamera() {
  const isNative = Capacitor.isNativePlatform();

  // Single photo (camera or prompt)
  async function pickPhoto(sourceOverride = null) {
    if (isNative) {
      const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
      const source = sourceOverride === 'camera' ? CameraSource.Camera
                   : sourceOverride === 'photos' ? CameraSource.Photos
                   : CameraSource.Prompt;
      const photo = await Camera.getPhoto({
        source,
        resultType: CameraResultType.Uri,
        quality: 85,
        allowEditing: false,
      });
      return webPathToFile(photo);
    }
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => resolve(e.target.files?.[0] || null);
      input.click();
    });
  }

  // Multi-photo from gallery (Android/iOS native picker — supports Google Photos)
  async function pickMultiplePhotos() {
    if (!isNative) return [];
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.pickImages({ quality: 85, limit: 0 });
    const files = [];
    for (const photo of result.photos) {
      try { files.push(await webPathToFile(photo)); } catch (e) { console.warn(e); }
    }
    return files;
  }

  return { pickPhoto, pickMultiplePhotos };
}
