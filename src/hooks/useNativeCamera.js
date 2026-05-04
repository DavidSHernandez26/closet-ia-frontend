import { Capacitor } from '@capacitor/core';

export function useNativeCamera() {
  const isNative = Capacitor.isNativePlatform();

  async function pickPhoto() {
    if (isNative) {
      const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        source: CameraSource.Prompt,
        resultType: CameraResultType.Base64,
        quality: 85,
        allowEditing: false,
      });

      // Convert base64 → File so the rest of the upload code stays the same
      const byteChars = atob(photo.base64String);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArr[i] = byteChars.charCodeAt(i);
      }
      const mimeType = `image/${photo.format}`;
      const blob = new Blob([byteArr], { type: mimeType });
      return new File([blob], `photo.${photo.format}`, { type: mimeType });
    }

    // Web fallback — open file picker
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => resolve(e.target.files?.[0] || null);
      input.click();
    });
  }

  return pickPhoto;
}
