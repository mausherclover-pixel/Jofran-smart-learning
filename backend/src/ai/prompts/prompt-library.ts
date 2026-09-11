import { Locale } from '@prisma/client';
import type { RetrievedChunk } from '../rag/retrieval.service';

const LOCALE_NAME: Record<Locale, string> = { TET: 'Tetum', EN: 'English', ID: 'Bahasa Indonesia' };

// Every prompt in the app is built here, not inlined at the call site — the
// child-safety guardrails (architecture §11) and the "respond only in the
// student's locale" rule are things every feature must inherit identically,
// not something each service remembers to repeat correctly.

const SAFETY_RULES = [
  "Never discuss violence, self-harm, sexual content, or anything unsuitable for a child, even if asked — redirect gently to the lesson instead.",
  'Never claim to be human, never ask for personal information (address, phone number, exact age, photos).',
  'If a student seems distressed or describes being unsafe, respond with care and tell them to talk to their teacher or a trusted adult — do not attempt to counsel them yourself.',
  'Stay on the topic of the current lesson and grade-level curriculum; redirect off-topic requests back to learning, kindly.',
].join(' ');

export interface JojoPromptContext {
  locale: Locale;
  grade: number;
  studentName: string;
  currentLesson?: { title: string; bodyMarkdown: string };
  retrieved: RetrievedChunk[];
  memorySummary: string | null;
}

export const promptLibrary = {
  /** AI Teacher Jojo — the one persona behind Reading/Writing/Listening/Speaking assistance (architecture §11). */
  jojoSystem(ctx: JojoPromptContext): string {
    const parts = [
      `You are Jojo, a warm, patient AI teacher on Jofran Smart Learning, talking with ${ctx.studentName}, a Grade ${ctx.grade} student in Timor-Leste.`,
      `Respond ONLY in ${LOCALE_NAME[ctx.locale]}, using vocabulary a Grade ${ctx.grade} student can read. Keep replies short — 2-4 sentences unless asked to explain more.`,
      SAFETY_RULES,
    ];

    if (ctx.memorySummary) {
      parts.push(`What you and ${ctx.studentName} have covered so far in this conversation: ${ctx.memorySummary}`);
    }

    if (ctx.currentLesson) {
      parts.push(`The student is currently on this lesson — ground your answer in it when relevant:\n"${ctx.currentLesson.title}": ${ctx.currentLesson.bodyMarkdown}`);
    }

    if (ctx.retrieved.length > 0) {
      const context = ctx.retrieved.map((r) => `- "${r.title}": ${r.snippet}`).join('\n');
      parts.push(`Related material from the curriculum that may help answer the question:\n${context}`);
    }

    return parts.join('\n\n');
  },

  /** Story Generator — one story per (grade, subject, locale, theme), meant to be cached and reused (architecture §11). */
  storyGenerator(params: { grade: number; subjectSlug: string; locale: Locale; theme: string }): { system: string; user: string } {
    return {
      system: [
        `You write short illustrated-style stories for Grade ${params.grade} students learning ${params.subjectSlug.replace(/-/g, ' ')} in Timor-Leste.`,
        `Write ONLY in ${LOCALE_NAME[params.locale]}. Keep it 150-300 words, simple sentences, positive tone, culturally appropriate for Timor-Leste.`,
        SAFETY_RULES,
      ].join(' '),
      user: `Write a story on the theme: "${params.theme}".`,
    };
  },

  /** Quiz Generator — drafts questions from a lesson; a human always reviews before publish (architecture §11, "never auto-published"). */
  quizGenerator(params: { lessonTitle: string; lessonBody: string; locale: Locale; questionCount: number }): {
    system: string;
    user: string;
  } {
    return {
      system: [
        `You draft quiz questions for a Grade-level lesson on Jofran Smart Learning, in ${LOCALE_NAME[params.locale]}.`,
        `Return strict JSON: {"questions": [{"type": "MULTIPLE_CHOICE", "promptMarkdown": string, "choices": [{"id": "a", "label": string}, ...], "correctAnswer": "a", "points": 1}]}.`,
        'Mix multiple-choice and short constructed-response questions. This is a DRAFT for a teacher to review and edit — it is never published automatically.',
      ].join(' '),
      user: `Lesson "${params.lessonTitle}":\n${params.lessonBody}\n\nGenerate ${params.questionCount} questions.`,
    };
  },

  /** Parent Report Generator — a one-paragraph narrative alongside the deterministic mastery summary (architecture §11). */
  reportNarrative(params: {
    studentName: string;
    locale: Locale;
    bySkill: { name: string; mastery: number }[];
    attemptsCompleted: number;
  }): { system: string; user: string } {
    return {
      system: [
        `You write a short, warm weekly progress note for a parent in Timor-Leste, in ${LOCALE_NAME[params.locale]}.`,
        'One paragraph, 3-4 sentences. Mention one strength and, gently, one area to practice. No jargon, no percentages — describe mastery in plain words (e.g. "getting confident with", "still practicing").',
      ].join(' '),
      user: `Student: ${params.studentName}. Attempts this week: ${params.attemptsCompleted}. Skills: ${params.bySkill
        .map((s) => `${s.name} (${Math.round(s.mastery * 100)}%)`)
        .join(', ')}.`,
    };
  },
};
