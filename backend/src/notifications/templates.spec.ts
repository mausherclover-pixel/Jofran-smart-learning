import { Locale } from '@prisma/client';
import { renderTemplate } from './templates';

// Architecture §13: Tetum, English, and Bahasa Indonesia are peers. This
// suite exists specifically to catch the failure mode where a new template
// key gets added for one locale and forgotten for the other two — a runtime
// gap that would otherwise only surface when a real Tetum-speaking parent
// happens to trigger the missing key.

describe('renderTemplate', () => {
  const knownTemplates = ['grade-posted', 'announcement', 'new-message'];
  const allLocales: Locale[] = [Locale.TET, Locale.EN, Locale.ID];

  it.each(knownTemplates)('renders "%s" in all three locales without throwing', (key) => {
    for (const locale of allLocales) {
      const result = renderTemplate(key, locale, {
        assessmentTitle: 'Addition Quiz 1',
        score: 8,
        maxScore: 10,
        message: 'School closed Friday',
        senderName: 'Maria Belo',
        preview: 'About the homework...',
      });
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);
    }
  });

  it('interpolates payload values into the body', () => {
    const result = renderTemplate('grade-posted', Locale.EN, {
      assessmentTitle: 'Addition Quiz 1',
      score: 8,
      maxScore: 10,
    });
    expect(result.body).toContain('Addition Quiz 1');
    expect(result.body).toContain('8/10');
  });

  it('throws on an unknown template key rather than silently returning empty content', () => {
    expect(() => renderTemplate('does-not-exist', Locale.EN, {})).toThrow();
  });
});
