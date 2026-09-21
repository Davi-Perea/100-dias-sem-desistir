import { View } from 'react-native';

import { LoadingCaption, SkeletonBlock, SkeletonPanel } from '../Skeleton';
import { spacing } from '../theme';

/**
 * F3 · Carregando, na forma de uma lista de blocos (Minhas reflexões).
 *
 * PROVISÓRIO (pergunta 13 ao designer / LACUNAS P42): o F3 só desenha o
 * esqueleto da Jornada. Aqui os retângulos seguem o bloco que cada item da
 * lista é hoje — rótulo "Dia N" (22) e duas linhas de citação (27) — em
 * `surfaceSunken` sobre `surfaceWarm`, sem brilho. Quem fala é o "Carregando…".
 */
export function ListSkeleton({ rows = 3, testID = 'list-skeleton' }: { rows?: number; testID?: string }) {
  return (
    <View testID={testID} style={{ gap: spacing.md }}>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonPanel key={index}>
          <SkeletonBlock width={72} height={18} />
          <SkeletonBlock width="100%" height={16} />
          <SkeletonBlock width="70%" height={16} />
        </SkeletonPanel>
      ))}
      <LoadingCaption />
    </View>
  );
}
