import { devCampaign, devStartDate } from '@/journey/fixtures/devCampaign';
import { calendarDateInCampaignTz, dateOfDay, officialDayInfo, rawCampaignDay } from '@/journey/officialDay';
import type { Campaign } from '@/journey/types';

const campaign: Campaign = {
  id: 'c1',
  title: 'Campanha',
  start_date: '2026-01-10',
  timezone: 'America/Sao_Paulo',
  utc_offset_minutes: -180,
  total_days: 100,
  status: 'active',
};

describe('dia oficial da campanha', () => {
  test('o dia 1 é a data de início', () => {
    expect(rawCampaignDay(new Date('2026-01-10T12:00:00Z'), campaign)).toBe(1);
  });

  test('avança um dia por data de calendário no fuso da campanha', () => {
    expect(rawCampaignDay(new Date('2026-01-11T12:00:00Z'), campaign)).toBe(2);
    expect(rawCampaignDay(new Date('2026-01-26T12:00:00Z'), campaign)).toBe(17);
  });

  test('usa o fuso da campanha, não o do aparelho', () => {
    // 02:00Z de 11/01 ainda é 23:00 de 10/01 em São Paulo → continua dia 1.
    expect(calendarDateInCampaignTz(new Date('2026-01-11T02:00:00Z'), campaign)).toBe('2026-01-10');
    expect(rawCampaignDay(new Date('2026-01-11T02:00:00Z'), campaign)).toBe(1);
    // 03:00Z já é 00:00 de 11/01 em São Paulo → vira dia 2.
    expect(rawCampaignDay(new Date('2026-01-11T03:00:00Z'), campaign)).toBe(2);
  });

  test('antes do início e depois do fim são clampados, mas a fase é reportada', () => {
    const before = officialDayInfo(new Date('2026-01-05T12:00:00Z'), campaign);
    expect(before.phase).toBe('before_start');
    expect(before.rawDay).toBeLessThan(1);
    expect(before.officialDay).toBe(1);

    const after = officialDayInfo(new Date('2026-06-01T12:00:00Z'), campaign);
    expect(after.phase).toBe('finished');
    expect(after.officialDay).toBe(100);
    expect(after.daysRemaining).toBe(0);
  });

  test('dias restantes decrescem ao longo da campanha', () => {
    expect(officialDayInfo(new Date('2026-01-10T12:00:00Z'), campaign).daysRemaining).toBe(99);
    expect(officialDayInfo(new Date('2026-01-26T12:00:00Z'), campaign).daysRemaining).toBe(83);
  });

  test('dateOfDay é o inverso de rawCampaignDay', () => {
    for (const day of [1, 17, 50, 100]) {
      const date = dateOfDay(day, campaign);
      expect(rawCampaignDay(new Date(`${date}T12:00:00Z`), campaign)).toBe(day);
    }
  });
});

describe('campanha de fixture', () => {
  test('coloca a data de referência no dia 17 (cenário do spec)', () => {
    const reference = new Date('2026-05-20T10:00:00Z');
    const fixture = devCampaign(reference);
    expect(officialDayInfo(reference, fixture).officialDay).toBe(17);
    expect(fixture.start_date).toBe(devStartDate(reference));
    expect(fixture.total_days).toBe(100);
  });
});
