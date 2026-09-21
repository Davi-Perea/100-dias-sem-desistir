import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from './icons';
import { BRAND_YELLOW, TAB_BAR_HEIGHT, fonts, glass, useTheme } from './theme';

/**
 * Forma mínima do que a tab bar precisa do navegador. Tipar estruturalmente
 * evita depender de `@react-navigation/bottom-tabs`, que o expo-router não
 * expõe como dependência direta deste projeto.
 */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  /** Altura renderizada, para a cena reservar o espaço certo embaixo. */
  onHeight?: (height: number) => void;
};

const ICONS: Record<string, IconName> = {
  index: 'home',
  jornada: 'flag',
  juntos: 'users',
  voce: 'person',
};

/**
 * Tab bar do handoff: 86px, vidro, ícone E rótulo sempre visíveis.
 *
 * O estado ativo não depende só do amarelo. A pílula é o realce, mas a tinta do
 * ícone e o peso do rótulo também mudam (700/#111 contra 600/#55534E), e o item
 * anuncia `selected` para leitores de tela. Amarelo sobre branco mede 1,46:1 —
 * sozinho ele não seria um indicador de estado aceitável.
 *
 * Android recebe superfície sólida com elevação em vez de vidro, como pede o
 * handoff: imitar o material do iOS ali fica errado.
 */
export function GlassTabBar({ state, descriptors, navigation, onHeight }: TabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const useGlass = Platform.OS === 'ios';

  const surface = isDark ? glass.darkLight : glass.light;

  const items = (
    <View style={{ flexDirection: 'row', minHeight: TAB_BAR_HEIGHT, paddingTop: 10 }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = (options.title ?? route.name) as string;
        const focused = state.index === index;
        const tint = focused ? colors.text : colors.navInactive;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            testID={`tab-${route.name}`}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{ flex: 1, alignItems: 'center', gap: 4 }}
          >
            <View
              style={{
                width: 52,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: focused ? BRAND_YELLOW : 'transparent',
              }}
            >
              <Icon name={ICONS[route.name] ?? 'home'} size={22} color={focused ? '#111111' : tint} />
            </View>
            <Text style={{ fontFamily: focused ? fonts.label : fonts.item, fontSize: 11, color: tint }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View
      onLayout={(event) => onHeight?.(Math.round(event.nativeEvent.layout.height))}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: isDark ? glass.hairlineDark : glass.hairline,
        paddingBottom: insets.bottom,
        backgroundColor: useGlass ? 'transparent' : colors.surface,
        ...(useGlass
          ? {}
          : { elevation: 8, shadowColor: '#111111', shadowOpacity: 0.12, shadowRadius: 12 }),
      }}
    >
      {useGlass ? (
        <BlurView
          intensity={40}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { backgroundColor: surface }]}
        />
      ) : null}
      {items}
    </View>
  );
}
