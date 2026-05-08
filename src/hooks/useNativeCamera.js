import { Capacitor } from '@capacitor/core';

async function galleryPhotoToFile(photo, index) {
  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const ext = photo.format || 'jpeg';
  return new File([blob], `photo_${Date.now()}_${index}.${ext}`, {
    type: blob.type || `image/${ext}`,
  });
}

// Solo para web — iOS/Android pierden el gesto de usuario en cadenas async
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

// ── Android ──────────────────────────────────────────────────────────────────
// pickPhoto: usa Camera.getPhoto con la fuente indicada
// pickMultiplePhotos: Camera.pickImages crea el Intent EXTRA_ALLOW_MULTIPLE nativamente

async function androidPickPhoto(sourceOverride) {
  const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
  const source =
    sourceOverride === 'camera' ? CameraSource.Camera : CameraSource.Photos;
  const photo = await Camera.getPhoto({
    source,
    resultType: CameraResultType.Uri,
    quality: 85,
    allowEditing: false,
  });
  return galleryPhotoToFile(photo, 0);
}

async function androidPickMultiple() {
  try {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.pickImages({ quality: 85, limit: 0 });
    if (!result.photos?.length) return [];
    return Promise.all(result.photos.map(galleryPhotoToFile));
  } catch {
    return [];
  }
}

// ── iOS ───────────────────────────────────────────────────────────────────────
// pickPhoto: Camera.getPhoto — nunca pickViaInput (iOS bloquea input.click async)
// pickMultiplePhotos: Camera.pickImages (iOS 14+, muestra selector múltiple nativo)

async function iosPickPhoto(sourceOverride) {
  const { Camera, CameraSource, CameraResultType } = await import('@capacitor/camera');
  const source =
    sourceOverride === 'camera' ? CameraSource.Camera : CameraSource.Photos;
  const photo = await Camera.getPhoto({
    source,
    resultType: CameraResultType.Uri,
    quality: 85,
    allowEditing: false,
  });
  return galleryPhotoToFile(photo, 0);
}

async function iosPickMultiple() {
  try {
    const { Camera } = await import('@capacitor/camera');
    const result = await Camera.pickImages({ quality: 85, limit: 0 });
    if (!result.photos?.length) return [];
    return Promise.all(result.photos.map(galleryPhotoToFile));
  } catch {
    // Fallback: foto única desde galería
    return iosPickPhoto('photos').then(f => (f ? [f] : []));
  }
}

// ── Hook público ─────────────────────────────────────────────────────────────

export function useNativeCamera() {
  const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

  async function pickPhoto(sourceOverride = null) {
    if (platform === 'android') return androidPickPhoto(sourceOverride);
    if (platform === 'ios')     return iosPickPhoto(sourceOverride);
    return pickViaInput({ multiple: false });
  }

  async function pickMultiplePhotos() {
    if (platform === 'android') return androidPickMultiple();
    if (platform === 'ios')     return iosPickMultiple();
    return pickViaInput({ multiple: true });
  }

  return { pickPhoto, pickMultiplePhotos };
}
