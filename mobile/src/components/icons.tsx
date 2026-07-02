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
