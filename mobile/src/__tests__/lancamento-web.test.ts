import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCampaign, resetToBundledContent } from '@/journey/datasetSource';
import { calendarDateInCampaignTz, officialDayInfo, rawCampaignDay } from '@/journey/officialDay';
import {
  _resetCompletionsCacheForTests,
  completedCount,
  isDayCompleted,
  loadCompletions,
  pendingDaysUpTo,
  setDayCompleted,
} from '@/progress/completionsStore';
import { DAILY_NOTICE_KEY, dailyNoticeMark } from '@/ui/jornada/dailyNotice';

/**
 * Matriz de lançamento (auditoria de 2026-09-23), nas DATAS REAIS da campanha.
 *
 * Os testes de `officialDay.test.ts` já cobrem o motor com uma campanha
 * sintética de janeiro. O que falta, e é o que um lançamento precisa, é provar
 * que o dataset REAL da igreja (23/09/2026 → 31/12/2026) produz os dias certos,
 * inclusive nas duas pontas e na virada da meia-noite de São Paulo.
 */
beforeEach(() => {
  resetToBundledContent();
  _resetCompletionsCacheForTests();
});

const campaign = () => getCampaign();

/** Meio-dia em São Paulo (UTC-3) da data dada, como instante absoluto. */
const meioDiaEmSP = (yyyyMmDd: string) => new Date(`${yyyyMmDd}T15:00:00Z`);

describe('motor do dia da campanha, nas datas reais', () => {
  test('o dataset embarcado é a campanha de 23/09 a 31/12 de 2026, fuso de São Paulo', () => {
    expect(campaign().start_date).toBe('2026-09-23');
    expect(campaign().total_days).toBe(100);
    expect(campaign().timezone).toBe('America/Sao_Paulo');
    // O Brasil não tem mais horário de verão desde 2019, então o deslocamento
    // fixo de -180 vale a campanha inteira. Se isso mudar, este teste cai.
    expect(campaign().utc_offset_minutes).toBe(-180);
  });

  test.each([
    ['2026-09-23', 1],
    ['2026-09-24', 2],
    ['2026-09-25', 3],
    ['2026-10-01', 9],
    ['2026-12-31', 100],
  ])('%s é o dia %i da campanha', (data, dia) => {
    expect(rawCampaignDay(meioDiaEmSP(data), campaign())).toBe(dia);
  });

  test('o último dia da campanha é exatamente 31/12/2026', () => {
    const fim = officialDayInfo(meioDiaEmSP('2026-12-31'), campaign());
    expect(fim.officialDay).toBe(campaign().total_days);
    expect(fim.phase).toBe('running');
    expect(fim.daysRemaining).toBe(0);
    // E 01/01/2027 já é campanha encerrada, sem passar de 100.
    const depois = officialDayInfo(meioDiaEmSP('2027-01-01'), campaign());
    expect(depois.phase).toBe('finished');
    expect(depois.officialDay).toBe(100);
    expect(depois.rawDay).toBe(101);
  });

  test('antes de 23/09 nenhum dia está correndo', () => {
    const antes = officialDayInfo(meioDiaEmSP('2026-09-22'), campaign());
    expect(antes.phase).toBe('before_start');
    expect(antes.rawDay).toBe(0);
  });
});

describe('virada da meia-noite, no relógio de São Paulo', () => {
  /**
   * O fuso do navegador de quem usa NÃO pode mandar no dia da igreja. Estes
   * instantes são absolutos: o mesmo momento para todo mundo no mundo.
   */
  test('23:59 de 23/09 em São Paulo ainda é o Dia 1', () => {
    const instante = new Date('2026-09-24T02:59:00Z'); // 23:59 em SP
    expect(calendarDateInCampaignTz(instante, campaign())).toBe('2026-09-23');
    expect(rawCampaignDay(instante, campaign())).toBe(1);
  });

  test('00:00 de 24/09 em São Paulo já é o Dia 2', () => {
    const instante = new Date('2026-09-24T03:00:00Z'); // 00:00 em SP
    expect(calendarDateInCampaignTz(instante, campaign())).toBe('2026-09-24');
    expect(rawCampaignDay(instante, campaign())).toBe(2);
  });

  test('um minuto separa os dois dias: não existe buraco nem dia repetido', () => {
    const antes = new Date('2026-09-24T02:59:59Z');
    const depois = new Date('2026-09-24T03:00:00Z');
    expect(rawCampaignDay(antes, campaign())).toBe(1);
    expect(rawCampaignDay(depois, campaign())).toBe(2);
  });

  test('quem está em Tóquio ou em Los Angeles vê o mesmo dia da igreja', () => {
    // O cálculo parte de um instante absoluto e do fuso da CAMPANHA; o relógio
    // do aparelho não entra na conta em lugar nenhum.
    const instante = new Date('2026-09-24T12:00:00Z');
    expect(rawCampaignDay(instante, campaign())).toBe(2);
  });
});

describe('dia perdido: o Dia 1 não some quando chega o Dia 2', () => {
  test('o hoje vira 2, o 1 continua em aberto, e concluir depois não corrompe nada', async () => {
    const id = campaign().id;
    const hojeEhDia2 = officialDayInfo(meioDiaEmSP('2026-09-24'), campaign());
    expect(hojeEhDia2.officialDay).toBe(2);

    // Dia 1 ficou por fazer.
    let completions = await loadCompletions(id);
    expect(isDayCompleted(completions, 1)).toBe(false);
    expect(pendingDaysUpTo(completions, 2)).toContain(1);

    // A pessoa volta e conclui o Dia 1 no Dia 2.
    completions = await setDayCompleted(id, 1, true);
    expect(isDayCompleted(completions, 1)).toBe(true);
    // O Dia 2 não foi afetado, e o total é o que deve ser.
    expect(isDayCompleted(completions, 2)).toBe(false);
    expect(completedCount(completions)).toBe(1);

    // Depois conclui o Dia 2: os dois convivem.
    completions = await setDayCompleted(id, 2, true);
    expect(completedCount(completions)).toBe(2);
    expect(isDayCompleted(completions, 1)).toBe(true);
    expect(pendingDaysUpTo(completions, 2)).toEqual([]);
  });

  test('nada apaga progresso sozinho: só uma chamada explícita desmarca', async () => {
    const id = campaign().id;
    await setDayCompleted(id, 1, true);
    // Passar o tempo (ler de novo em outro dia) não mexe no que foi concluído.
    const depois = await loadCompletions(id);
    expect(isDayCompleted(depois, 1)).toBe(true);
    const desmarcado = await setDayCompleted(id, 1, false);
    expect(isDayCompleted(desmarcado, 1)).toBe(false);
  });
});

describe('aviso do dia: uma vez por dia, e a marca sobrevive a fechar o navegador', () => {
  test('a marca é do dia, então o Dia 2 traz o aviso de novo', () => {
    const id = campaign().id;
    expect(dailyNoticeMark(id, 1)).not.toBe(dailyNoticeMark(id, 2));
  });

  test('a marca é gravada no armazenamento, não só na memória da aba', async () => {
    // Na web, o AsyncStorage é o armazenamento do navegador: fechar a aba, ou o
    // navegador inteiro, não apaga. É isso que faz o aviso não voltar no F5.
    await AsyncStorage.setItem(DAILY_NOTICE_KEY, dailyNoticeMark(campaign().id, 1));
    expect(await AsyncStorage.getItem(DAILY_NOTICE_KEY)).toBe(dailyNoticeMark(campaign().id, 1));
    // E a marca não conta nada sobre a fé de ninguém: é campanha:dia.
    expect(dailyNoticeMark(campaign().id, 1)).toMatch(/^[^:]+:1$/);
  });
});
