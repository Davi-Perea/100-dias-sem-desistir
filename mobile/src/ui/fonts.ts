// Uma face por import, pelo subcaminho do pacote. Importar pela raiz
// (`@expo-google-fonts/schibsted-grotesk`) faz o index do pacote dar require()
// em todas as 28 faces das duas famílias — 5,4 MB no binário, das quais só as
// oito abaixo (1,4 MB) são usadas. O Metro não descarta asset requerido.
import { SchibstedGrotesk_400Regular } from '@expo-google-fonts/schibsted-grotesk/400Regular';
import { SchibstedGrotesk_500Medium } from '@expo-google-fonts/schibsted-grotesk/500Medium';
import { SchibstedGrotesk_600SemiBold } from '@expo-google-fonts/schibsted-grotesk/600SemiBold';
import { SchibstedGrotesk_700Bold } from '@expo-google-fonts/schibsted-grotesk/700Bold';
import { SchibstedGrotesk_800ExtraBold } from '@expo-google-fonts/schibsted-grotesk/800ExtraBold';
import { SourceSerif4_400Regular } from '@expo-google-fonts/source-serif-4/400Regular';
import { SourceSerif4_400Regular_Italic } from '@expo-google-fonts/source-serif-4/400Regular_Italic';
import { SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4/600SemiBold';
import { useFonts } from 'expo-font';

/**
 * Schibsted Grotesk (interface e display) e Source Serif 4 (leitura), as duas
 * sob licença OFL e empacotadas localmente — nada é buscado na rede em tempo de
 * execução. Oito faces, o mesmo número do app anterior.
 *
 * As chaves são exatamente os nomes usados em `faces` (src/ui/theme.ts).
 */
export const appFonts = {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
  SourceSerif4_400Regular,
  SourceSerif4_400Regular_Italic,
  SourceSerif4_600SemiBold,
};

/**
 * Retorna `true` quando as faces estão prontas OU quando falharam.
 *
 * Falha de fonte não pode travar o aplicativo numa tela em branco: o texto
 * aparece com a face do sistema e a jornada continua. Uma leitura bíblica
 * inacessível por causa de tipografia seria pior do que uma fonte substituta.
 */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(appFonts);
  return loaded || error !== null;
}
