import { Capacitor } from '@capacitor/core';
import { Camera, CameraSource, CameraResultType } from '@capacitor/camera';

/**
 * Returns a function that opens camera/gallery natively on iOS/Android,
 * or falls back to a hidden <input type="file"> on web.
 *
 * Usage:
 *   const pickPhoto = useNativeCamera();
 *   const file = await pickPhoto();  // returns a File object
 */
export function useNativeCamera() {
  const isNative = Capacitor.isNativePlatform();

  async function pickPhoto() {
    if (isNative) {
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
