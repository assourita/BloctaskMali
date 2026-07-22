/** Charge le SDK Google Maps JS une seule fois. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadGoogleMaps(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('window unavailable'));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.google?.maps) {
    return Promise.resolve(w.google.maps);
  }
  if (w.__btGmapsPromise) {
    return w.__btGmapsPromise;
  }
  if (!apiKey) {
    return Promise.reject(new Error('googleMapsApiKey manquante'));
  }
  w.__btGmapsPromise = new Promise((resolve: (v: unknown) => void, reject: (e: Error) => void) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (w.google?.maps) resolve(w.google.maps);
      else reject(new Error('Google Maps non disponible'));
    };
    script.onerror = () => reject(new Error('Échec chargement Google Maps'));
    document.head.appendChild(script);
  });
  return w.__btGmapsPromise;
}
