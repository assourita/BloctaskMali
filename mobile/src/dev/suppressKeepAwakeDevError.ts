import { LogBox } from 'react-native';

/** Bug connu Expo Go Android en dev — sans impact fonctionnel. */
const KEEP_AWAKE = /unable to (de)?activate keep awake/i;

if (__DEV__) {
  LogBox.ignoreLogs([KEEP_AWAKE]);

  const onUnhandled = (event: { reason?: unknown; preventDefault?: () => void }) => {
    const msg = String(
      (event?.reason as { message?: string })?.message ?? event?.reason ?? '',
    );
    if (KEEP_AWAKE.test(msg)) {
      event.preventDefault?.();
    }
  };

  // RN / Hermes — évite le rouge "Uncaught (in promise)" au bundling
  if (typeof globalThis.addEventListener === 'function') {
    globalThis.addEventListener('unhandledrejection', onUnhandled as EventListener);
  }
}
