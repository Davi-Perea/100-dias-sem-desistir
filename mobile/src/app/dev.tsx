import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { clearRecordedEvents, recordedEvents } from '@/analytics/analytics';
import { contentState, getDataset, resetToBundledContent, resetToDevFixtures } from '@/journey/datasetSource';
import { useJourney } from '@/journey/useJourney';
import { validateDataset, assertProductionReady } from '@/journey/validator';
import { resetCompletions } from '@/progress/completionsStore';
import { resetFasting } from '@/fasting/fastingStore';
import { resetReflections } from '@/reflections/reflectionsStore';
import { updateSettings, useSettings } from '@/settings/settingsStore';
import { AppText, Button, Card, Checkbox, Divider, Screen, ScreenScroll, StateView } from '@/ui/components';
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
            <AppText variant="cap">Dataset ativo</AppText>
            <AppText style={{ fontWeight: '600' }}>{dataset.provenance.source_name}</AppText>
            <AppText variant="muted">
              rights_status: {dataset.provenance.rights_status} · versão: {dataset.provenance.content_version}
            </AppText>
            <AppText variant="muted">
              estado: {contentState()} · DEV_ONLY: {String(dataset.DEV_ONLY)} · dias: {dataset.days.length} · início:{' '}
              {dataset.campaign.start_date}
            </AppText>
            <AppText variant="muted">
              origem: {dataset.provenance.source_type} · {dataset.provenance.source_provider ?? '—'}
            </AppText>
            <AppText variant="muted">
              nomes de líderes: {dataset.provenance.leader_names_authorized ? 'liberados' : 'ocultos até autorização'}
            </AppText>
            <Divider />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Button
                title="Conteúdo real (guia)"
                variant={dataset.DEV_ONLY ? 'outline' : 'primary'}
                onPress={() => {
                  const result = resetToBundledContent();
                  setValidation(result.ok ? 'Conteúdo real carregado.' : 'Conteúdo real inválido; veja a validação.');
                }}
              />
              <Button
                title="Fixtures fictícias"
                variant={dataset.DEV_ONLY ? 'primary' : 'outline'}
                onPress={() => {
                  resetToDevFixtures();
                  setValidation('Fixtures carregadas (hoje = dia 17).');
                }}
              />
            </View>
          </View>
        </Card>

        <View style={{ gap: spacing.sm }}>
          <Button
            title="Validar dataset"
            variant="outline"
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
            <AppText variant="cap">Simular o dia oficial</AppText>
            <AppText variant="muted">
              Dia atual: {journey.officialDay} de {journey.campaign.total_days} (início {journey.campaign.start_date},
              {journey.campaign.timezone})
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {[1, 7, 17, 25, 50, 75, 100].map((day) => (
                <Button
                  key={day}
                  title={`Dia ${day}`}
                  variant={settings.dev.dayOverride === day ? 'primary' : 'outline'}
                  onPress={() => updateSettings((s) => ({ ...s, dev: { ...s.dev, dayOverride: day } }))}
                />
              ))}
              <Button
                title="Data real"
                variant={settings.dev.dayOverride === null ? 'primary' : 'outline'}
                onPress={() => updateSettings((s) => ({ ...s, dev: { ...s.dev, dayOverride: null } }))}
              />
            </View>
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.md }}>
            <AppText variant="cap">Simular estados</AppText>
            <DevToggle
              label="Carregamento lento"
              checked={settings.dev.slowLoad}
              onToggle={() => updateSettings((s) => ({ ...s, dev: { ...s.dev, slowLoad: !s.dev.slowLoad } }))}
            />
            <DevToggle
              label="Falha ao carregar"
              checked={settings.dev.failLoad}
              onToggle={() => updateSettings((s) => ({ ...s, dev: { ...s.dev, failLoad: !s.dev.failLoad } }))}
            />
          </View>
        </Card>

        <Card>
          <View style={{ gap: spacing.sm }}>
            <AppText variant="cap">Dados locais</AppText>
            <Button
              title="Apagar progresso"
              variant="outline"
              onPress={async () => {
                await resetCompletions(journey.campaign.id);
                await refresh();
              }}
            />
            <Button
              title="Apagar jejum e reflexões"
              variant="outline"
              onPress={async () => {
                await resetFasting(journey.campaign.id);
                await resetReflections(journey.campaign.id);
                await refresh();
              }}
            />
            <Button
              title="Refazer onboarding"
              variant="outline"
              onPress={() => updateSettings((s) => ({ ...s, onboardingCompleted: false }))}
            />
            <Button
              title="Apagar tudo e voltar ao conteúdo real"
              variant="danger"
              onPress={async () => {
                await AsyncStorage.clear();
                resetToBundledContent();
                clearRecordedEvents();
                await refresh();
              }}
            />
          </View>
        </Card>

        <Card tone="muted">
          <View style={{ gap: spacing.xs }}>
            <AppText variant="cap">Eventos registrados ({events.length})</AppText>
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
            <AppText variant="cap">AsyncStorage ({keys.length} chaves)</AppText>
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

/** Alternância simples do painel DEV; não faz parte do sistema visual do produto. */
function DevToggle({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <AppText variant="item" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Checkbox checked={checked} onToggle={onToggle} label={label} />
    </View>
  );
}
