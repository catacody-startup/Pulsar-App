import { describe, expect, it } from 'vitest';
import { pdfText } from './pdf';

describe('PDF text', () => {
  it('spells out what the standard PDF fonts cannot show', () => {
    expect(pdfText('SpO₂ ≥ 95% · ≈ 456 mSv – µGy/h ✓')).toBe('SpO2 >= 95% · ~ 456 mSv – µGy/h ');
    expect(pdfText('Lucía’s “check-in”')).toBe('Lucía\'s "check-in"');
    expect(pdfText('火星')).toBe('??');
  });
});
