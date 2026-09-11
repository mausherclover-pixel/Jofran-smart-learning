import { Locale } from '@prisma/client';

type Renderer = (payload: Record<string, any>) => { title: string; body: string };

// Per-locale templates — architecture §13: Tetum/English/Bahasa Indonesia
// are peers, so every template key must define all three or fail loudly.
const TEMPLATES: Record<string, Record<Locale, Renderer>> = {
  'grade-posted': {
    TET: (p) => ({ title: 'Rezultadu foun', body: `${p.assessmentTitle}: ${p.score}/${p.maxScore}` }),
    EN: (p) => ({ title: 'New grade posted', body: `${p.assessmentTitle}: ${p.score}/${p.maxScore}` }),
    ID: (p) => ({ title: 'Nilai baru', body: `${p.assessmentTitle}: ${p.score}/${p.maxScore}` }),
  },
  announcement: {
    TET: (p) => ({ title: 'Avizu husi eskola', body: p.message }),
    EN: (p) => ({ title: 'Announcement', body: p.message }),
    ID: (p) => ({ title: 'Pengumuman sekolah', body: p.message }),
  },
  'new-message': {
    TET: (p) => ({ title: 'Mensajen foun', body: `${p.senderName}: ${p.preview}` }),
    EN: (p) => ({ title: 'New message', body: `${p.senderName}: ${p.preview}` }),
    ID: (p) => ({ title: 'Pesan baru', body: `${p.senderName}: ${p.preview}` }),
  },
};

export function renderTemplate(templateKey: string, locale: Locale, payload: Record<string, any>) {
  const template = TEMPLATES[templateKey]?.[locale];
  if (!template) throw new Error(`No template "${templateKey}" for locale "${locale}"`);
  return template(payload);
}
