// ============================================================
// Rule matcher tests
// ============================================================

import { describe, it, expect } from 'vitest';
import { matchRules } from '../../src/domain/rules/ruleMatcher';
import type { RuleCandidate } from '../../src/domain/rules/types';

function rule(over: Partial<RuleCandidate> = {}): RuleCandidate {
  return {
    id: 'rule-1',
    name: 'Gopay → Transport',
    matchType: 'DESCRIPTION',
    operator: 'CONTAINS',
    value: 'GOPAY',
    categoryId: 'cat-1',
    categoryName: 'Transportasi',
    ...over,
  };
}

describe('matchRules', () => {
  it('returns null for an empty description', () => {
    expect(matchRules([rule()], { description: '   ', type: 'EXPENSE' })).toBeNull();
  });

  it('returns null when no rules match', () => {
    expect(matchRules([rule()], { description: 'Belanja Indomaret', type: 'EXPENSE' })).toBeNull();
  });

  it('matches DESCRIPTION contains, case-insensitively', () => {
    const match = matchRules([rule()], { description: 'top up gopay 50rb', type: 'EXPENSE' });
    expect(match).toMatchObject({
      ruleId: 'rule-1',
      categoryId: 'cat-1',
      reason: 'Matched by rule: "Gopay → Transport"',
    });
  });

  it('matches DESCRIPTION equals only on an exact match', () => {
    const r = rule({ operator: 'EQUALS', value: 'GOPAY' });
    expect(matchRules([r], { description: 'GOPAY', type: 'EXPENSE' })).not.toBeNull();
    expect(matchRules([r], { description: 'top up GOPAY', type: 'EXPENSE' })).toBeNull();
  });

  it('matches DESCRIPTION starts with / ends with', () => {
    const starts = rule({ operator: 'STARTS_WITH', value: 'SPOTIFY' });
    expect(matchRules([starts], { description: 'SPOTIFY AB Monthly', type: 'EXPENSE' })).not.toBeNull();
    expect(matchRules([starts], { description: 'Monthly SPOTIFY AB', type: 'EXPENSE' })).toBeNull();

    const ends = rule({ operator: 'ENDS_WITH', value: 'monthly' });
    expect(matchRules([ends], { description: 'Spotify Monthly', type: 'EXPENSE' })).not.toBeNull();
  });

  it('matches MERCHANT via normalized comparison', () => {
    const r = rule({ matchType: 'MERCHANT', operator: 'EQUALS', value: 'Steam', categoryName: 'Entertainment' });
    const match = matchRules([r], { description: 'STEAM ###', type: 'EXPENSE' });
    expect(match).toMatchObject({ categoryId: 'cat-1' });
  });

  it('matches TRANSACTION_TYPE by equality regardless of stored operator', () => {
    const r = rule({ matchType: 'TRANSACTION_TYPE', operator: 'CONTAINS', value: 'TRANSFER' });
    expect(matchRules([r], { description: 'anything', type: 'TRANSFER' })).not.toBeNull();
    expect(matchRules([r], { description: 'anything', type: 'EXPENSE' })).toBeNull();
  });

  it('returns the first matching rule in array order (ascending priority is the caller\'s job)', () => {
    const first = rule({ id: 'rule-a', value: 'GOPAY', categoryId: 'cat-a' });
    const second = rule({ id: 'rule-b', value: 'GO', categoryId: 'cat-b' });
    const match = matchRules([first, second], { description: 'GOPAY topup', type: 'EXPENSE' });
    expect(match?.ruleId).toBe('rule-a');
  });

  it('ignores a disabled-in-name rule with empty value (no accidental universal match)', () => {
    const r = rule({ value: '' });
    expect(matchRules([r], { description: 'anything at all', type: 'EXPENSE' })).toBeNull();
  });
});
