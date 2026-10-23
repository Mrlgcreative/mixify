import assert from 'node:assert/strict';
import test from 'node:test';

import { computeProfileStats } from './profileStats.ts';
import type { HistoryEntry } from '../types/music.ts';

const now = Date.parse('2026-10-23T12:00:00.000Z');

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: Math.random().toString(36),
    title: 'Nuit Lumière',
    artist: 'Kléo Vane',
    genre: 'Électro',
    durationMs: 180_000,
    playedAt: '2026-10-23T10:00:00.000Z',
    ...overrides,
  };
}

test('computeProfileStats agrège écoutes, temps et artistes uniques', () => {
  const stats = computeProfileStats(
    [
      entry(),
      entry({ playedAt: '2026-10-20T10:00:00.000Z' }),
      entry({ artist: 'Aurore Noire', genre: 'Pop', durationMs: 120_000 }),
      entry({ track: { id: 't1' } as HistoryEntry['track'] }),
      entry({ track: { id: 't1' } as HistoryEntry['track'] }),
    ],
    now,
  );

  assert.equal(stats.plays, 5);
  assert.equal(stats.listeningMs, 840_000);
  assert.equal(stats.uniqueTracks, 3); // 2 titres texte distincts + un id de catalogue
  assert.equal(stats.uniqueArtists, 2);
  assert.equal(stats.last7Days, 5);
  assert.deepEqual(stats.topArtists[0], { name: 'Kléo Vane', plays: 4 });
  assert.deepEqual(stats.topGenres, [
    { name: 'Électro', plays: 4 },
    { name: 'Pop', plays: 1 },
  ]);
});

test('computeProfileStats ignore les écoutes de plus de 7 jours', () => {
  const stats = computeProfileStats(
    [entry({ playedAt: '2026-10-01T10:00:00.000Z' })],
    now,
  );

  assert.equal(stats.last7Days, 0);
});
