import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../../src/context/AuthContext';
import { getTracking, type TrackingData } from '../../src/api/missions';
import { sendLocation } from '../../src/api/tracking';
import { PrimaryButton, SecondaryButton } from '../../src/components/buttons';
import { Card, EmptyState, Loader } from '../../src/components/ui';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/widgets';
import { BlockTaskMap } from '../../src/components/BlockTaskMap';
import type { MapUser } from '../../src/api/map';
import { colors, spacing } from '../../src/constants/theme';
import { ApiError } from '../../src/api/client';

const BAMAKO = { lat: 12.6392, lng: -8.0029 };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export default function TrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeRole } = useAuth();
  const isProvider = activeRole === 'provider';
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [autoShare, setAutoShare] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastSent = useRef(0);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setData(await getTracking(id));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    timer.current = setInterval(load, 15000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  useEffect(() => {
    return () => {
      watchRef.current?.remove();
      watchRef.current = null;
    };
  }, []);

  const pushLocation = async (lat: number, lng: number, silent = false) => {
    if (!id) return;
    const now = Date.now();
    if (silent && now - lastSent.current < 8000) return;
    lastSent.current = now;
    setMyLocation({ lat, lng });
    await sendLocation(id, lat, lng);
    if (!silent) await load();
  };

  const shareGps = async () => {
    if (!id) return;
    setSharing(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS', 'Permission de localisation refusée.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      await pushLocation(pos.coords.latitude, pos.coords.longitude);
      Alert.alert('OK', 'Position partagée avec le client.');
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Partage GPS impossible');
    } finally {
      setSharing(false);
    }
  };

  const toggleAutoShare = async () => {
    if (autoShare) {
      watchRef.current?.remove();
      watchRef.current = null;
      setAutoShare(false);
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('GPS', 'Permission de localisation refusée.');
        return;
      }
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000,
          distanceInterval: 25,
        },
        (pos) => {
          pushLocation(pos.coords.latitude, pos.coords.longitude, true).catch(() => undefined);
        },
      );
      setAutoShare(true);
      const pos = await Location.getCurrentPositionAsync({});
      await pushLocation(pos.coords.latitude, pos.coords.longitude);
    } catch (e) {
      Alert.alert('Erreur', e instanceof ApiError ? e.message : 'Suivi GPS impossible');
    }
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`,
    });
    if (url) Linking.openURL(url).catch(() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`));
  };

  const provider = data?.provider_location;
  const pickup = data?.pickup;
  const delivery = data?.delivery;

  const mapUsers = useMemo((): MapUser[] => {
    const users: MapUser[] = [];
    if (provider) {
      users.push({
        id: 'provider',
        name: 'Prestataire',
        first_name: 'Prestataire',
        last_name: '',
        user_type: 'provider',
        latitude: provider.latitude,
        longitude: provider.longitude,
        city: '',
        source: 'gps',
        location_precision: 'exact',
        is_live: true,
      });
    }
    if (pickup?.latitude != null && pickup?.longitude != null) {
      users.push({
        id: 'pickup',
        name: pickup.address || 'Départ',
        first_name: 'Départ',
        last_name: '',
        user_type: 'client',
        latitude: pickup.latitude,
        longitude: pickup.longitude,
        city: '',
        source: 'city',
        location_precision: 'approximate',
        is_live: false,
      });
    }
    if (delivery?.latitude != null && delivery?.longitude != null) {
      users.push({
        id: 'delivery',
        name: delivery.address || 'Arrivée',
        first_name: 'Arrivée',
        last_name: '',
        user_type: 'enterprise',
        latitude: delivery.latitude,
        longitude: delivery.longitude,
        city: '',
        source: 'city',
        location_precision: 'approximate',
        is_live: false,
      });
    }
    return users;
  }, [provider, pickup, delivery]);

  const mapCenter = useMemo(() => {
    if (provider) return { lat: provider.latitude, lng: provider.longitude };
    if (myLocation) return myLocation;
    if (delivery?.latitude != null && delivery?.longitude != null) {
      return { lat: delivery.latitude, lng: delivery.longitude };
    }
    if (pickup?.latitude != null && pickup?.longitude != null) {
      return { lat: pickup.latitude, lng: pickup.longitude };
    }
    return BAMAKO;
  }, [provider, myLocation, delivery, pickup]);

  let distanceToDelivery: number | null = null;
  if (provider && delivery?.latitude != null && delivery?.longitude != null) {
    distanceToDelivery = haversineKm(
      { lat: provider.latitude, lng: provider.longitude },
      { lat: delivery.latitude, lng: delivery.longitude },
    );
  }

  if (loading) {
    return (
      <AppLayout showBack title="Suivi GPS">
        <Loader />
      </AppLayout>
    );
  }

  return (
    <AppLayout showBack title="Suivi GPS">
      <PageHeader title="Suivi GPS" subtitle="Position en temps réel (rafraîchi toutes les 15 s)" />

      <View style={styles.mapBox}>
        <BlockTaskMap center={mapCenter} users={mapUsers} myLocation={myLocation} />
      </View>

      {isProvider && (
        <View style={styles.actions}>
          <PrimaryButton label="Partager ma position maintenant" loading={sharing} onPress={shareGps} />
          <SecondaryButton
            label={autoShare ? 'Arrêter le suivi continu' : 'Activer le suivi continu'}
            onPress={toggleAutoShare}
          />
          {autoShare ? (
            <Text style={styles.autoHint}>Partage automatique actif — position envoyée en continu.</Text>
          ) : null}
        </View>
      )}

      {provider ? (
        <Card style={styles.live}>
          <Text style={styles.liveLabel}>Position du prestataire</Text>
          <Text style={styles.coords}>
            {provider.latitude.toFixed(5)}, {provider.longitude.toFixed(5)}
          </Text>
          {provider.timestamp ? (
            <Text style={styles.time}>Mis à jour : {new Date(provider.timestamp).toLocaleTimeString('fr-FR')}</Text>
          ) : null}
          {distanceToDelivery != null ? (
            <Text style={styles.distance}>≈ {distanceToDelivery.toFixed(1)} km du point d'arrivée</Text>
          ) : null}
          <SecondaryButton
            label="Ouvrir dans Maps"
            onPress={() => openInMaps(provider.latitude, provider.longitude, 'Prestataire')}
          />
        </Card>
      ) : (
        <EmptyState message="Aucune position partagée pour le moment." />
      )}

      {pickup?.latitude != null && pickup?.longitude != null ? (
        <Card>
          <Text style={styles.pointLabel}>Point de départ</Text>
          {pickup.address ? <Text style={styles.address}>{pickup.address}</Text> : null}
          <SecondaryButton label="Voir sur la carte" onPress={() => openInMaps(pickup.latitude!, pickup.longitude!, 'Départ')} />
        </Card>
      ) : null}

      {delivery?.latitude != null && delivery?.longitude != null ? (
        <Card>
          <Text style={styles.pointLabel}>Point d'arrivée</Text>
          {delivery.address ? <Text style={styles.address}>{delivery.address}</Text> : null}
          <SecondaryButton label="Voir sur la carte" onPress={() => openInMaps(delivery.latitude!, delivery.longitude!, 'Arrivée')} />
        </Card>
      ) : null}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  mapBox: { height: 280, marginBottom: spacing.md, borderRadius: 16, overflow: 'hidden' },
  actions: { gap: spacing.sm, marginBottom: spacing.md },
  autoHint: { color: colors.success, fontSize: 12, fontWeight: '600' },
  live: { backgroundColor: '#f0faf4', borderColor: colors.primary },
  liveLabel: { color: colors.textMuted, fontSize: 13 },
  coords: { fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: 4 },
  time: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  distance: { color: colors.accent, fontWeight: '700', marginTop: 8 },
  pointLabel: { fontWeight: '700', color: colors.text, marginBottom: 4 },
  address: { color: colors.textMuted, marginBottom: spacing.sm },
});
