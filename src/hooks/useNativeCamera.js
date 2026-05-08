import { Capacitor } from '@capacitor/core';

function pickViaInput({ multiple = false, capture = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (multiple) input.multiple = true;
    if (capture) input.capture = 'environment';
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(input);

    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      document.body.removeChild(input);
      resolve(multiple ? files : (files[0] || null));
    };

    // Si el usuario cancela sin seleccionar
    const onFocus = () => {
      setTimeout(() => {
        if (input.files?.length === 0) {
          document.body.removeChild(input);
          resolve(multiple ? [] : null);
        }
        window.removeEventListener('focus', onFocus);
      }, 500);
    };
    window.addEventListener('focus', onFocus);

    input.click();
  });
}

export function useNativeCamera() {
  const isNative = Capacitor.isNativePlatform();

  async function pickPhoto(sourceOverride = null) {
    if (isNative && sourceOverride === 'camera') {
      // Cámara real: usar Capacitor para acceder a la cámara directamente
      const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 85,
        allowEditing: false,
      });
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const ext = photo.format || 'jpeg';
      return new File([blob], `photo_${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` });
    }

    // Galería (nativo o web): input HTML — funciona en Capacitor WebView con multi-select
    return pickViaInput({ multiple: false });
  }

  async function pickMultiplePhotos() {
    // Input con multiple=true — activa multi-select nativo en Android/iOS WebView
    return pickViaInput({ multiple: true });
  }

  return { pickPhoto, pickMultiplePhotos };
}
