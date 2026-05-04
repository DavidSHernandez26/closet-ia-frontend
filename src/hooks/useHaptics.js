import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

export const haptics = {
  // Tap ligero — navegación, chips, toggles
  light: () => isNative && Haptics.impact({ style: ImpactStyle.Light }),
  // Tap medio — botones principales
  medium: () => isNative && Haptics.impact({ style: ImpactStyle.Medium }),
  // Tap fuerte — acciones importantes (subir, guardar)
  heavy: () => isNative && Haptics.impact({ style: ImpactStyle.Heavy }),
  // Éxito — confirmaciones
  success: () => isNative && Haptics.notification({ type: NotificationType.Success }),
  // Error
  error: () => isNative && Haptics.notification({ type: NotificationType.Error }),
  // Selección — scroll de opciones
  selection: () => isNative && Haptics.selectionStart(),
};
