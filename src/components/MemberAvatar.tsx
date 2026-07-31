import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { radius, useTheme } from '@/design';
import { Text } from './Text';

interface MemberAvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
}

export function MemberAvatar({ name, uri, size = 44 }: MemberAvatarProps) {
  const theme = useTheme();
  const initial = name?.trim().charAt(0).toLocaleUpperCase('pt-BR') || '•';

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: theme.colors.accentSoft,
          borderColor: theme.colors.accentEdge,
        },
      ]}
    >
      {uri ? (
        <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      ) : (
        <Text variant="callout" color="accent">
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
