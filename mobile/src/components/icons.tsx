import { View } from 'react-native';
import { colors } from '../constants/theme';

/** Petite maison dessinée en Views natives. */
export function HouseIcon({
  size = 22,
  color = '#fff',
  doorColor,
}: {
  size?: number;
  color?: string;
  doorColor?: string;
}) {
  const roof = size * 0.52;
  const door = doorColor ?? (color === '#fff' ? 'rgba(255,255,255,0.45)' : colors.primaryDark);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: roof,
          borderRightWidth: roof,
          borderBottomWidth: size * 0.34,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          marginBottom: -1,
        }}
      />
      <View
        style={{
          width: size * 0.58,
          height: size * 0.42,
          backgroundColor: color,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: size * 0.1,
        }}
      >
        <View
          style={{
            width: size * 0.22,
            height: size * 0.2,
            borderRadius: 1,
            backgroundColor: door,
          }}
        />
      </View>
    </View>
  );
}

/** Grille tableau de bord (4 carrés). */
export function GridIcon({ size = 22, color = colors.textMuted }: { size?: number; color?: string }) {
  const cell = size * 0.38;
  const gap = size * 0.1;
  const rows = [
    [0, 1],
    [2, 3],
  ];
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-between' }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {row.map((i) => (
            <View
              key={i}
              style={{
                width: cell,
                height: cell,
                borderRadius: cell * 0.22,
                backgroundColor: color,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Point d'interrogation dans un cercle (aide). */
export function HelpIcon({ size = 22, color = colors.textMuted }: { size?: number; color?: string }) {
  const r = size / 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        borderWidth: 1.8,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: size * 0.07,
          backgroundColor: color,
          marginBottom: size * 0.06,
        }}
      />
      <View
        style={{
          width: size * 0.14,
          height: size * 0.28,
          borderTopLeftRadius: size * 0.07,
          borderTopRightRadius: size * 0.07,
          borderWidth: 1.8,
          borderColor: color,
          borderBottomWidth: 0,
        }}
      />
    </View>
  );
}

/** Épingle carte (footer Carte BlockTask). */
export function MapPinIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  const head = size * 0.34;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: head,
          height: head,
          borderRadius: head / 2,
          backgroundColor: color,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.5)',
        }}
      />
      <View
        style={{
          width: 0,
          height: 0,
          marginTop: -2,
          borderLeftWidth: head * 0.55,
          borderRightWidth: head * 0.55,
          borderTopWidth: head * 0.9,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
        }}
      />
    </View>
  );
}

/** Cloche de notification dessinée en Views natives (aucune dépendance d'icônes). */
export function BellIcon({ size = 20, color = colors.text }: { size?: number; color?: string }) {
  const dome = size * 0.78;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: dome,
          height: size * 0.5,
          borderTopLeftRadius: dome / 2,
          borderTopRightRadius: dome / 2,
          borderWidth: 1.8,
          borderColor: color,
          borderBottomWidth: 0,
          marginTop: -1,
        }}
      />
      <View
        style={{
          width: size * 0.96,
          height: 1.8,
          backgroundColor: color,
          borderRadius: 1,
          marginTop: -1,
        }}
      />
      <View
        style={{
          width: size * 0.16,
          height: size * 0.16,
          borderRadius: size * 0.08,
          backgroundColor: color,
          marginTop: 1.5,
        }}
      />
    </View>
  );
}

/** Globe icon for onboarding. */
export function GlobeIcon({ size = 52, color = colors.primary }: { size?: number; color?: string }) {
  const r = size / 2;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.85,
          height: size * 0.85,
          borderRadius: r,
          borderWidth: 2.5,
          borderColor: color,
          borderStyle: 'dashed',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: r,
          borderWidth: 2,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: r,
          backgroundColor: color,
          opacity: 0.2,
        }}
      />
    </View>
  );
}

/** Clipboard list icon for onboarding. */
export function ClipboardListIcon({ size = 52, color = colors.accent }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.7,
          height: size * 0.85,
          backgroundColor: color,
          borderRadius: 4,
          opacity: 0.15,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.6,
          height: size * 0.75,
          backgroundColor: color,
          borderRadius: 3,
          opacity: 0.3,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.5,
          height: size * 0.65,
          backgroundColor: color,
          borderRadius: 2,
          opacity: 0.5,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.1,
          width: size * 0.3,
          height: size * 0.08,
          backgroundColor: color,
          borderRadius: 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.25,
          width: size * 0.4,
          height: size * 0.06,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.35,
          width: size * 0.35,
          height: size * 0.06,
          backgroundColor: color,
          borderRadius: 1,
        }}
      />
    </View>
  );
}

/** Shield check icon for onboarding. */
export function ShieldCheckIcon({ size = 52, color = '#0ea5e9' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.75,
          height: size * 0.85,
          backgroundColor: color,
          borderRadius: size * 0.4,
          opacity: 0.2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.6,
          height: size * 0.7,
          backgroundColor: color,
          borderRadius: size * 0.35,
          opacity: 0.4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.25,
          height: size * 0.25,
          borderWidth: 3,
          borderColor: color,
          borderRadius: size * 0.12,
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.12,
          height: size * 0.18,
          backgroundColor: color,
          borderRadius: 2,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  );
}

/** Rocket icon for onboarding. */
export function RocketIcon({ size = 52, color = colors.primary }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: size * 0.3,
          borderRightWidth: size * 0.3,
          borderBottomWidth: size * 0.5,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          opacity: 0.3,
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size * 0.35,
          height: size * 0.45,
          backgroundColor: color,
          borderRadius: size * 0.15,
          opacity: 0.5,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.35,
          width: size * 0.2,
          height: size * 0.35,
          backgroundColor: color,
          borderRadius: size * 0.08,
          opacity: 0.4,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.55,
          width: size * 0.15,
          height: size * 0.25,
          backgroundColor: color,
          borderRadius: size * 0.06,
          opacity: 0.6,
        }}
      />
    </View>
  );
}
