// Mirrors backend/prisma/schema.prisma — kept in sync by hand for now; a
// later step can generate this from the OpenAPI/GraphQL schema instead.

export type Role = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'PRINCIPAL' | 'TEACHER' | 'PARENT' | 'STUDENT';
export type Locale = 'TET' | 'EN' | 'ID';

export interface AuthUser {
  id: string;
  role: Role;
  schoolId: string | null;
  fullName: string;
  username: string | null;
  email: string | null;
  locale: Locale;
  isActive: boolean;
}

export interface ClassSummary {
  id: string;
  name: string;
  grade: number;
  _count?: { enrollments: number };
  teacher?: { id: string; fullName: string };
}

export interface ProgressRecord {
  id: string;
  mastery: number;
  attempts: number;
  skill: { id: string; name: string; subject: { slug: string; grade: number } };
}

export type AssessmentType = 'QUIZ' | 'TEST' | 'HOMEWORK';
export type QuestionType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'CONSTRUCTED_RESPONSE' | 'SPEAKING';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADING' | 'GRADED';

export interface Question {
  id: string;
  type: QuestionType;
  promptMarkdown: string;
  choices?: { id: string; label: string }[] | null;
  points: number;
}

export interface Assessment {
  id: string;
  title: string;
  type: AssessmentType;
  classId: string;
  dueAt: string | null;
  questions: Question[];
  _count?: { questions: number; attempts: number };
}

export interface Attempt {
  id: string;
  status: AttemptStatus;
  score: number | null;
  maxScore: number | null;
  responses: { id: string; questionId: string; answer: unknown; isCorrect: boolean | null; score: number | null }[];
}

export interface Lesson {
  id: string;
  order: number;
  published: boolean;
  variants: { locale: Locale; title: string; bodyMarkdown: string; mediaKeys: string[] }[];
  unit: { subject: { slug: string; grade: number } };
}

export interface NotificationItem {
  id: string;
  templateKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
}

export interface ProgressReport {
  id: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: {
    bySkill: { skillId: string; name: string; mastery: number }[];
    attemptsCompleted: number;
    averageScore: number | null;
  };
  narrative: string | null; // AI-written note from the Parent Report Generator (architecture §11)
}
