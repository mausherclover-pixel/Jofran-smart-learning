'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { assessmentsApi } from '@/lib/api/assessments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DraftQuestion = {
  type: 'MULTIPLE_CHOICE' | 'CONSTRUCTED_RESPONSE';
  promptMarkdown: string;
  points: number;
  choices: string[];
  correctIndex: number;
};

function blankQuestion(): DraftQuestion {
  return { type: 'MULTIPLE_CHOICE', promptMarkdown: '', points: 1, choices: ['', ''], correctIndex: 0 };
}

export default function NewAssessmentPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<DraftQuestion[]>([blankQuestion()]);
  const [saving, setSaving] = useState(false);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await assessmentsApi.create({
        classId,
        title,
        type: 'QUIZ',
        questions: questions.map((q) => ({
          type: q.type,
          promptMarkdown: q.promptMarkdown,
          points: q.points,
          ...(q.type === 'MULTIPLE_CHOICE'
            ? {
                choices: q.choices.map((label, i) => ({ id: String.fromCharCode(97 + i), label })),
                correctAnswer: String.fromCharCode(97 + q.correctIndex),
              }
            : {}),
        })),
      });
      toast.success('Assessment created');
      router.push(`/teacher/classes/${classId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the assessment');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New assessment</h1>
        <p className="text-muted-foreground">Multiple-choice grades instantly; anything else goes to Jojo for grading.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Addition Quiz 2" required />
      </div>

      {questions.map((q, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Question {i + 1}</CardTitle>
            {questions.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={q.type}
                onChange={(e) => updateQuestion(i, { type: e.target.value as DraftQuestion['type'] })}
              >
                <option value="MULTIPLE_CHOICE">Multiple choice</option>
                <option value="CONSTRUCTED_RESPONSE">Written answer (AI-graded)</option>
              </select>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={q.points}
                onChange={(e) => updateQuestion(i, { points: Number(e.target.value) })}
                aria-label="Points"
              />
            </div>

            <Input
              value={q.promptMarkdown}
              onChange={(e) => updateQuestion(i, { promptMarkdown: e.target.value })}
              placeholder="What is 24 + 15?"
              required
            />

            {q.type === 'MULTIPLE_CHOICE' && (
              <div className="space-y-2">
                {q.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correctIndex === ci}
                      onChange={() => updateQuestion(i, { correctIndex: ci })}
                      className="h-4 w-4 accent-secondary"
                      aria-label={`Choice ${ci + 1} is correct`}
                    />
                    <Input
                      value={choice}
                      onChange={(e) =>
                        updateQuestion(i, { choices: q.choices.map((c, idx) => (idx === ci ? e.target.value : c)) })
                      }
                      placeholder={`Choice ${ci + 1}`}
                      required
                    />
                  </div>
                ))}
                {q.choices.length < 4 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => updateQuestion(i, { choices: [...q.choices, ''] })}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add choice
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])}>
        <Plus className="mr-2 h-4 w-4" /> Add question
      </Button>

      <Button type="submit" size="lg" className="w-full" disabled={saving}>
        {saving ? 'Creating…' : 'Create assessment'}
      </Button>
    </form>
  );
}
