import { describe, expect, it } from 'vitest';
import { validateQuestionCount, selectionKey, isReadingMatch } from './exam-core';
describe('teacher exam selection rules', () => {
  it('accepts more questions than the number of formats', () => { expect(validateQuestionCount(20, 25)).toBe(20); });
  it('does not repeat a question to exceed the available bank', () => { expect(() => validateQuestionCount(26, 25)).toThrow('25'); });
  it('requires a positive whole question count', () => { expect(() => validateQuestionCount(0, 25)).toThrow(); expect(() => validateQuestionCount(2.5, 25)).toThrow(); });
  it('uses identical settings independent of lesson selection order', () => { expect(selectionKey(1, ['b', 'a'], 7)).toBe(selectionKey(1, ['a', 'b'], 7)); });
  it('different requested counts produce different links', () => { expect(selectionKey(1, ['a'], 7)).not.toBe(selectionKey(1, ['a'], 8)); });
});
describe('conservative Arabic reading checks', () => {
  it('accepts the same words without diacritics', () => { expect(isReadingMatch('بِسْمِ اللَّهِ', 'بسم الله')).toBe(true); });
  it('does not mark omitted words or different letters correct', () => { expect(isReadingMatch('بسم الله الرحمن الرحيم', 'بسم الله')).toBe(false); expect(isReadingMatch('بَ', 'تَ')).toBe(false); });
});