import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { clearRecordedEvents, recordedEvents } from '@/analytics/analytics';
import { getDataset, resetToDevFixtures } from '@/journey/datasetSource';
import { CANONICAL_SOURCE_TARGET } from '@/journey/fixtures/devCampaign';
import { useJourney } from '@/journey/useJourney';
import { validateDataset, assertProductionReady } from '@/journey/validator';
import { resetCompletions } from '@/progress/completionsStore';
import { resetFasting } from '@/fasting/fastingStore';
import { resetReflections } from '@/reflections/reflectionsStore';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Button, Card, Divider, Screen, ScreenScroll, SettingRow, StateView } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

/** Ferramentas de desenvolvimento. Não faz parte do produto: remover ou ocultar em produção. */
export default function DevScreen() {
  const { colors } = useTheme();
  const settings = useSettings();
  const journey = useJourney();
  const [keys, setKeys] = useState<{ key: string; value: string }[]>([]);
  const [validation, setValidation] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(allKeys);
    setKeys(pairs.map(([key, value]) => ({ key, value: (value ?? '').slice(0, 220) })));
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getAllKeys()
      .then((allKeys) => AsyncStorage.multiGet(allKeys))
      .then((pairs) => {
        if (alive) setKeys(pairs.map(([key, value]) => ({ key, value: (value ?? '').slice(0, 220) })));
      });
    return () => {
      alive = false;
    };
  }, [settings, journey.completions]);

  if (!settings) {
    return (
      <Screen>
        <StateView kind="loading" />
      </Screen>
    );
  }

  const dataset = getDataset();
  const events = recordedEvents();

  return (
    <Screen>
      <ScreenScroll>
        <Card tone="muted">
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow">Dataset ativo</AppText>
            <AppText style={{ fontWeight: '600' }}>{dataset.provenance.source_name}</AppText>
            <AppText variant="muted">
              rights_status: {dataset.provenance.rights_status} · versão: {dataset.provenance.content_version}
            </AppText>
            <AppText variant="muted">
              DEV_ONLY: {String(dataset.DEV_ONLY)} · dias: {dataset.days.length}
            </AppText>
            <Divider />
            <AppText variant="eyebrow">Fonte editorial desejada (Gate 2)</AppText>
            <AppText variant="muted">
              {CANONICAL_SOURCE_TARGET.source_name} · ID {CANONICAL_SOURCE_TARGET.source_external_id} ·{' '}
              {CANONICAL_SOURCE_TARGET.source_provider}
            </AppText>
            <AppText variant="muted">{CANONICAL_SOURCE_TARGET.note}</AppText>
          </View>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button
            title="Validar dataset"
            variant="secondary"
            onPress={() => {
              const dev = validateDataset(dataset);
              const prod = assertProductionReady(dataset);
              setValidation(
                `Desenvolvimento: ${dev.valid ? 'válido' : 'inválido'} (${dev.issues.length} apontamento(s)).\n` +
                  `Produção: ${prod.valid ? 'liberado' : 'BLOQUEADO'} — ${prod.issues
                    .filter((i) => i.severity === 'error')
                    .map((i) => i.message)
                    .join(' | ') || 'sem erros'}`,
              );
            }}
          />
          {validation ? (
            <Card tone="muted">
              <AppText variant="muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {validation}
              </AppText>
            </Card>
          ) : null}
        </View>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">Simular o dia oficial</AppText>
            <AppText variant="muted">
              Dia atual: {journey.officialDay} de {journey.campaign.total_days} (início {journey.campaign.start_date},
              {journey.campaign.timezone})
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[1, 7, 17, 25, 50, 75, 100].map((day) => (
                <Button
                  key={day}
                  title={`Dia ${day}`}
                  variant={settings.dev.dayOverride === day ? 'primary' : 'secondary'}
                  onPress={() => updateSettings((s) => ({ ...s, dev: { ...s.dev, dayOverride: day } }))}
                />
              ))}
              <Button
                title="Data real"
                variant={settings.dev.dayOverride === null ? 'primary' : 'secondary'}
                onPress={() => updateSettings((s) => ({ ...s, dev: { ...s.dev, dayOverride: null } }))}
              />
            </View>
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="eyebrow">Simular estados</AppText>
            <SettingRow
              title="Carregamento lento"
              value={settings.dev.slowLoad}
              onValueChange={(v) => updateSettings((s) => ({ ...s, dev: { ...s.dev, slowLoad: v } }))}
            />
            <SettingRow
              title="Falha ao carregar"
              value={settings.dev.failLoad}
              onValueChange={(v) => updateSettings((s) => ({ ...s, dev: { ...s.dev, failLoad: v } }))}
            />
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="eyebrow">Dados locais</AppText>
            <Button
              title="Apagar progresso"
              variant="secondary"
              onPress={async () => {
                await resetCompletions(journey.campaign.id);
                await refresh();
              }}
            />
            <Button
              title="Apagar jejum e reflexões"
              variant="secondary"
              onPress={async () => {
                await resetFasting(journey.campaign.id);
                await resetReflections(journey.campaign.id);
                await refresh();
              }}
            />
            <Button
              title="Refazer onboarding"
              variant="secondary"
              onPress={() => updateSettings((s) => ({ ...s, onboardingCompleted: false }))}
            />
            <Button
              title="Apagar tudo e recarregar fixtures"
              variant="danger"
              onPress={async () => {
                await AsyncStorage.clear();
                resetToDevFixtures();
                clearRecordedEvents();
                await refresh();
              }}
            />
          </View>
        </Card>

        <Card tone="muted">
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow">Eventos registrados ({events.length})</AppText>
            <AppText variant="muted">
              {settings.analyticsEnabled
                ? 'Buffer local. Nenhum evento sai do aparelho: não há fornecedor conectado.'
                : 'Analytics desligado nos ajustes (padrão).'}
            </AppText>
            {events.slice(0, 12).map((e, i) => (
              <AppText key={i} variant="muted" style={{ fontSize: 11, color: colors.textMuted }}>
                {e.at.slice(11, 19)} · {JSON.stringify(e.event)}
              </AppText>
            ))}
          </View>
        </Card>

        <Card tone="muted">
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow">AsyncStorage ({keys.length} chaves)</AppText>
            {keys.map((item) => (
              <View key={item.key} style={{ gap: 2, paddingVertical: 4 }}>
                <AppText style={{ fontWeight: '600', fontSize: 12 }}>{item.key}</AppText>
                <AppText variant="muted" style={{ fontSize: 11 }}>
                  {item.value}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      </ScreenScroll>
    </Screen>
  );
}
