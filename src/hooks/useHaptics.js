import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

let _haptics = null;
async function getHaptics() {
  if (!_haptics) _haptics = await import('@capacitor/haptics');
  return _haptics;
}

export const haptics = {
  light:     () => isNative && getHaptics().then(({ Haptics, ImpactStyle })     => Haptics.impact({ style: ImpactStyle.Light })),
  medium:    () => isNative && getHaptics().then(({ Haptics, ImpactStyle })     => Haptics.impact({ style: ImpactStyle.Medium })),
  heavy:     () => isNative && getHaptics().then(({ Haptics, ImpactStyle })     => Haptics.impact({ style: ImpactStyle.Heavy })),
  success:   () => isNative && getHaptics().then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success })),
  error:     () => isNative && getHaptics().then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Error })),
  selection: () => isNative && getHaptics().then(({ Haptics })                  => Haptics.selectionStart()),
};
