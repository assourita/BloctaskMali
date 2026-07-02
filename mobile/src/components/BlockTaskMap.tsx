import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { MapUser } from '../api/map';

const TYPE_COLORS: Record<string, string> = {
  client: '#2563eb',
  provider: '#047857',
  enterprise: '#7c3aed',
};

export interface BlockTaskMapHandle {
  focusUser: (userId: string, lat: number, lng: number) => void;
}

interface BlockTaskMapProps {
  center: { lat: number; lng: number };
  users: MapUser[];
  myLocation?: { lat: number; lng: number } | null;
  focusUserId?: string | null;
  onUserPress?: (user: MapUser) => void;
}

function buildMapHtml(
  center: { lat: number; lng: number },
  users: MapUser[],
  myLocation?: { lat: number; lng: number } | null,
): string {
  const markers = users.map((u) => ({
    ...u,
    color: TYPE_COLORS[u.user_type] || '#047857',
    initials: (u.name || u.first_name || '?').slice(0, 2).toUpperCase(),
    linked: !!u.mission_link,
  }));

  const payload = JSON.stringify({ center, markers, myLocation: myLocation || null });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map { margin: 0; height: 100%; width: 100%; background: #0f172a; }
    .bt-pin {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 800; font-size: 13px;
      border: 3px solid #fff;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35);
      font-family: system-ui, sans-serif;
    }
    .bt-pin.live { box-shadow: 0 0 0 4px rgba(16,185,129,0.45), 0 4px 14px rgba(0,0,0,0.35); }
    .bt-pin.linked { border-color: #fbbf24; box-shadow: 0 0 0 3px rgba(251,191,36,0.5), 0 4px 14px rgba(0,0,0,0.35); }
    .leaflet-control-attribution { font-size: 9px; opacity: 0.6; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const data = ${payload};
    const map = L.map('map', { zoomControl: true }).setView([data.center.lat, data.center.lng], 12);
    window.btMap = map;
    window.btMarkers = {};

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    if (data.myLocation) {
      L.circleMarker([data.myLocation.lat, data.myLocation.lng], {
        radius: 8, color: '#fff', weight: 3, fillColor: '#10b981', fillOpacity: 1
      }).addTo(map).bindPopup('Vous');
    }

    data.markers.forEach((m) => {
      const cls = 'bt-pin' + (m.is_live ? ' live' : '') + (m.linked ? ' linked' : '');
      const html = '<div class="' + cls + '" style="background:' + m.color + '">' + m.initials + '</div>';
      const icon = L.divIcon({ html, className: '', iconSize: [44, 44], iconAnchor: [22, 22] });
      const marker = L.marker([m.latitude, m.longitude], { icon }).addTo(map);
      window.btMarkers[m.id] = marker;
      const typeLabel = m.user_type === 'enterprise' ? 'Entreprise' : m.user_type === 'provider' ? 'Prestataire' : 'Client';
      const prec = m.location_precision === 'exact' ? ' · position exacte' : ' · zone approximative';
      marker.bindPopup('<strong>' + m.name + '</strong><br/>' + typeLabel + (m.city ? ' · ' + m.city : '') + prec);
      marker.on('click', () => {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'user', id: m.id }));
      });
    });

    window.focusMapUser = function(id, lat, lng) {
      if (window.btMap) {
        window.btMap.setView([lat, lng], 16, { animate: true });
      }
      if (window.btMarkers[id]) {
        window.btMarkers[id].openPopup();
      }
    };
  </script>
</body>
</html>`;
}

export const BlockTaskMap = forwardRef<BlockTaskMapHandle, BlockTaskMapProps>(function BlockTaskMap(
  { center, users, myLocation, focusUserId, onUserPress },
  ref,
) {
  const webRef = useRef<WebView>(null);
  const html = useMemo(
    () => buildMapHtml(center, users, myLocation),
    [center, users, myLocation],
  );

  useImperativeHandle(ref, () => ({
    focusUser: (userId: string, lat: number, lng: number) => {
      webRef.current?.injectJavaScript(
        `window.focusMapUser && window.focusMapUser('${userId}', ${lat}, ${lng}); true;`,
      );
    },
  }));

  useEffect(() => {
    if (!focusUserId) return;
    const u = users.find((x) => x.id === focusUserId);
    if (!u) return;
    webRef.current?.injectJavaScript(
      `window.focusMapUser && window.focusMapUser('${u.id}', ${u.latitude}, ${u.longitude}); true;`,
    );
  }, [focusUserId, users]);

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        style={styles.webview}
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data) as { type: string; id: string };
            if (msg.type === 'user' && onUserPress) {
              const user = users.find((u) => u.id === msg.id);
              if (user) onUserPress(user);
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0f172a' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
