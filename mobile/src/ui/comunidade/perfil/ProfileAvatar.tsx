import { useState } from 'react';
import { Image, View } from 'react-native';

import { Avatar } from '@/ui/components';
import { useTheme } from '@/ui/theme';

/**
 * Foto de perfil redonda (C4) ou, sem foto (ou se a URL falhar), as iniciais do
 * `Avatar` de sempre. Decorativa: o nome está sempre escrito ao lado.
 *
 * A URL vem assinada (bucket privado) e só existe para foto aprovada, ou para a
 * própria pessoa enquanto a foto está em análise. Nunca uma foto de outra fonte.
 */
export function ProfileAvatar({
  name,
  uri,
  size = 42,
  testID,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState<string | null>(null);
  if (!uri || failed === uri) {
    return (
      <View testID={testID}>
        <Avatar name={name} size={size} />
      </View>
    );
  }
  return (
    <Image
      testID={testID}
      source={{ uri }}
      onError={() => setFailed(uri)}
      accessible={false}
      aria-hidden
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceMuted }}
    />
  );
}
