import { Capacitor } from '@capacitor/core';

// Convierte un GalleryPhoto de Capacitor en File
async function galleryPhotoToFile(photo, index) {
  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const ext = photo.format || 'jpeg';
  return new File([blob], `photo_${Date.now()}_${index}.${ext}`, {
    type: blob.type || `image/${ext}`,
  });
}

// Fallback web: input HTML con multi-select
function pickViaInput({ multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (multiple) input.setAttribute('multiple', '');
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(input);

    let settled = false;
    const settle = (val) => {
      if (settled) return;
      settled = true;
      if (input.parentNode) document.body.removeChild(input);
      resolve(val);
    };

    input.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      settle(multiple ? files : (files[0] || null));
    };

    // Cancelación: el documento vuelve a ser visible sin que onchange haya disparado
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          if (!settled) settle(multiple ? [] : null);
          document.removeEventListener('visibilitychange', onVisibility);
        }, 600);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    input.click();
  });
}

export function useNativeCamera() {
  const isNative = Capacitor.isNativePlatform();

  async function pickPhoto(sourceOverride = null) {
    if (isNative && sourceOverride === 'camera') {
      const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        source: CameraSource.Camera,
        resultType: CameraResultType.Uri,
        quality: 85,
        allowEditing: false,
      });
      return galleryPhotoToFile(photo, 0);
    }
    // Galería individual o web: input HTML
    return pickViaInput({ multiple: false });
  }

  async function pickMultiplePhotos() {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      // Camera.pickImages() crea el Intent con EXTRA_ALLOW_MULTIPLE=true nativamente
      try {
        const { Camera } = await import('@capacitor/camera');
        const result = await Camera.pickImages({ quality: 85, limit: 0 });
        if (!result.photos?.length) return [];
        return Promise.all(result.photos.map(galleryPhotoToFile));
      } catch {
        return pickViaInput({ multiple: true });
      }
    }
    // iOS y web: input HTML con multiple (WKWebView soporta multi-select nativo)
    return pickViaInput({ multiple: true });
  }

  return { pickPhoto, pickMultiplePhotos };
}
