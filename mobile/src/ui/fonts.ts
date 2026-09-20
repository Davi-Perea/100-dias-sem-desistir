import {
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
} from '@expo-google-fonts/archivo';
import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_600SemiBold,
} from '@expo-google-fonts/literata';
import { useFonts } from 'expo-font';

/**
 * Archivo (interface e display) e Literata (leitura longa), empacotadas
 * localmente conforme o handoff — nada é buscado na rede em tempo de execução.
 *
 * As chaves são exatamente os nomes usados em `fonts` (src/ui/theme.ts).
 */
export const appFonts = {
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_600SemiBold,
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
