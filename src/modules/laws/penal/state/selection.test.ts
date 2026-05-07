import { describe, expect, it } from 'vitest';
import { PENAL_PARAGRAPHS } from '../data/paragraphs';
import { PENAL_SCENARIOS } from '../data/scenarios';
import {
  eligibleRecallParagraphs,
  eligibleScenarios,
  isRecallComplete,
  isScenariosComplete,
  pickNextRecallParagraph,
  pickNextScenario,
} from './selection';

describe('penal selection — scenarios', () => {
  it('all 28 are eligible when progress is empty', () => {
    expect(eligibleScenarios({ progress: {}, turn: 0 }, PENAL_SCENARIOS).length).toBe(28);
  });

  it('filters out scenarios with score >= 2', () => {
    const state = {
      progress: { 'penal.scenario.A1': { score: 2, lastAskedAtTurn: 0 } },
      turn: 1,
    };
    const eligible = eligibleScenarios(state, PENAL_SCENARIOS);
    expect(eligible.length).toBe(27);
    expect(eligible.find((s) => s.id === 'penal.scenario.A1')).toBeUndefined();
  });

  it('isScenariosComplete is true only when all are mastered', () => {
    expect(isScenariosComplete({ progress: {}, turn: 0 }, PENAL_SCENARIOS)).toBe(false);
    const allMastered = Object.fromEntries(
      PENAL_SCENARIOS.map((s) => [s.id, { score: 2, lastAskedAtTurn: 0 }]),
    );
    expect(isScenariosComplete({ progress: allMastered, turn: 0 }, PENAL_SCENARIOS)).toBe(true);
  });

  it('pickNextScenario returns null when complete', () => {
    const allMastered = Object.fromEntries(
      PENAL_SCENARIOS.map((s) => [s.id, { score: 2, lastAskedAtTurn: 0 }]),
    );
    expect(pickNextScenario({ progress: allMastered, turn: 0 }, PENAL_SCENARIOS)).toBeNull();
  });

  it('pickNextScenario returns a scenario when available', () => {
    const result = pickNextScenario({ progress: {}, turn: 0 }, PENAL_SCENARIOS);
    expect(result).not.toBeNull();
    expect(result?.id).toMatch(/^penal\.scenario\.[A-E]\d$/);
  });
});

describe('penal selection — recall', () => {
  it('all 75 paragraphs are eligible when progress is empty', () => {
    expect(eligibleRecallParagraphs({ progress: {}, turn: 0 }, PENAL_PARAGRAPHS).length).toBe(75);
  });

  it('filters out paragraphs with score >= 2', () => {
    const state = {
      progress: { 'penal.25': { score: 2, lastAskedAtTurn: 0 } },
      turn: 1,
    };
    const eligible = eligibleRecallParagraphs(state, PENAL_PARAGRAPHS);
    expect(eligible.length).toBe(74);
    expect(eligible.find((p) => p.id === 'penal.25')).toBeUndefined();
  });

  it('isRecallComplete is true only when all are mastered', () => {
    expect(isRecallComplete({ progress: {}, turn: 0 }, PENAL_PARAGRAPHS)).toBe(false);
    const allMastered = Object.fromEntries(
      PENAL_PARAGRAPHS.map((p) => [p.id, { score: 2, lastAskedAtTurn: 0 }]),
    );
    expect(isRecallComplete({ progress: allMastered, turn: 0 }, PENAL_PARAGRAPHS)).toBe(true);
  });

  it('pickNextRecallParagraph returns a paragraph when available', () => {
    const result = pickNextRecallParagraph({ progress: {}, turn: 0 }, PENAL_PARAGRAPHS);
    expect(result).not.toBeNull();
    expect(result?.id).toMatch(/^penal\.\d+$/);
  });
});
