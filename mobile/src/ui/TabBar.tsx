import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFace } from './components';
import { Icon, type IconName } from './icons';
import { MIN_TOUCH, TABBAR_MIN_HEIGHT, faces, glass, navShadow, useTheme } from './theme';

/**
 * Forma mínima do que a tab bar precisa do navegador. Tipar estruturalmente
 * evita depender de `@react-navigation/bottom-tabs`, que o expo-router não
 * expõe como dependência direta deste projeto.
 */
type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string; tabBarItemStyle?: unknown } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  /** Espaço que a barra ocupa a partir do fundo da tela, para a cena reservar. */
  onHeight?: (height: number) => void;
};

/**
 * Uma aba com `href: null` no layout (ex.: Comunidade desligada em
 * `config/features.ts`) continua no estado do navegador; o expo-router só a
 * marca com `tabBarItemStyle: { display: 'none' }`, que esta barra própria
 * precisa respeitar. A rota segue existindo, só não tem botão.
 */
function isHiddenTab(options: { tabBarItemStyle?: unknown }): boolean {
  const flat = StyleSheet.flatten(options.tabBarItemStyle as never) as { display?: string } | undefined;
  return flat?.display === 'none';
}

const ICONS: Record<string, IconName> = {
  // A casa (rota "index", em "/") é a Jornada.
  index: 'journey',
  jornada: 'journey',
  juntos: 'community',
  comunidade: 'community',
  // Livro aberto, traço 2 como os outros ícones da barra.
  biblia: 'book',
  voce: 'you',
};

/**
 * Barra de navegação flutuante (TOKENS §5): pílula solta sobre o conteúdo, 20 de
 * margem lateral, piso 64, vidro, filete e sombra. Ícone E rótulo sempre — nenhum
 * ícone carrega significado sozinho neste app.
 *
 * Ativo: pílula `markSurface` com ícone e rótulo em `onMark`, rótulo em 700.
 * Inativo: sem fundo, `navInactive`, rótulo em 500.
 *
 * Os "26 do fundo" do desenho valem na moldura do iPhone, onde o padding de 8
 * deixa os alvos exatamente acima da área do indicador de home (34). Aqui a
 * distância nunca é menor que a área segura menos esse padding, senão, no
 * Android com três botões, a pílula cobriria a navegação do sistema.
 */
export function GlassTabBar({ state, descriptors, navigation, onHeight }: TabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const face = useFace();
  const useGlass = Platform.OS === 'ios';
  const bottom = Math.max(26, insets.bottom - 8);
  const barTint = isDark ? glass.navDark : glass.nav;

  return (
    <View
      testID="tab-bar"
      onLayout={(event) => onHeight?.(Math.round(event.nativeEvent.layout.height + bottom))}
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom,
        borderRadius: 999,
        // No Android a elevação precisa de fundo próprio; ali não se imita vidro
        // com opacidade chapada: é superfície sólida, como pede o TOKENS.
        backgroundColor: useGlass ? 'transparent' : colors.surface,
        ...navShadow(isDark),
      }}
    >
      <View
        style={{
          borderRadius: 999,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDark ? glass.hairlineDark : glass.hairline,
        }}
      >
        {useGlass ? (
          <BlurView
            intensity={60}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, { backgroundColor: barTint }]}
          />
        ) : null}
        <View style={{ flexDirection: 'row', minHeight: TABBAR_MIN_HEIGHT, padding: 8 }}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            if (isHiddenTab(options)) return null;
            const label = (options.title ?? route.name) as string;
            const focused = state.index === index;
            const tint = focused ? colors.onMark : colors.navInactive;
            // O recorte do ícone de comunidade precisa ser OPACO: com a tinta
            // translúcida do vidro, o círculo de trás aparecia através do da frente.
            const background = focused ? colors.markSurface : colors.surface;
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
                style={({ pressed }) => [
                  {
                    flex: 1,
                    minHeight: MIN_TOUCH,
                    borderRadius: 999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    paddingVertical: 6,
                    paddingHorizontal: 4,
                    backgroundColor: focused ? colors.markSurface : 'transparent',
                  },
                  pressed && !focused && { opacity: 0.72 },
                ]}
              >
                {/* 24: os ícones da barra são medidos em pixels no TOKENS
                    (traços de 2,5, alturas 9/16/12/6), com 1 unidade = 1px. */}
                <Icon name={ICONS[route.name] ?? 'journey'} size={24} color={tint} cutout={background} />
                <Text
                  style={{
                    fontFamily: face(focused ? faces.sg700 : faces.sg500),
                    fontSize: 11,
                    lineHeight: 13,
                    color: tint,
                    textAlign: 'center',
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
