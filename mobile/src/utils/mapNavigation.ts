import { Linking, Platform } from 'react-native';

/** Ouvre l'app Maps native avec itinéraire vers une destination. */
export function openNavigationTo(
  destLat: number,
  destLng: number,
  label: string,
  origin?: { lat: number; lng: number } | null,
): void {
  const dest = `${destLat},${destLng}`;
  const name = encodeURIComponent(label);

  let url: string | undefined;
  if (Platform.OS === 'ios') {
    if (origin) {
      url = `maps://?saddr=${origin.lat},${origin.lng}&daddr=${dest}&dirflg=d`;
    } else {
      url = `maps://?daddr=${dest}&dirflg=d`;
    }
  } else if (Platform.OS === 'android') {
    if (origin) {
      url = `google.navigation:q=${dest}&mode=d`;
    } else {
      url = `geo:0,0?q=${dest}(${name})`;
    }
  }

  const fallback = origin
    ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  if (url) {
    Linking.openURL(url).catch(() => Linking.openURL(fallback));
  } else {
    Linking.openURL(fallback);
  }
}

/** Centre la carte sur un point sans lancer la navigation. */
export function openMapsAt(lat: number, lng: number, label: string): void {
  const url = Platform.select({
    ios: `maps:0,0?q=${encodeURIComponent(label)}@${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`,
  });
  const fallback = `https://www.google.com/maps?q=${lat},${lng}`;
  if (url) {
    Linking.openURL(url).catch(() => Linking.openURL(fallback));
  } else {
    Linking.openURL(fallback);
  }
}
