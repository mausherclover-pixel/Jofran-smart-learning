'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useApiData } from '@/hooks/use-api-data';
import { assessmentsApi, attemptsApi } from '@/lib/api/assessments';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Attempt } from '@/types/api';

type Phase = 'preview' | 'in-progress' | 'submitting' | 'done';

export default function QuizPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = use(params);
  const router = useRouter();
  const assessment = useApiData(() => assessmentsApi.getOne(assessmentId), [assessmentId]);

  const [phase, setPhase] = useState<Phase>('preview');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<Attempt | null>(null);

  async function handleStart() {
    const attempt = await attemptsApi.start(assessmentId);
    setAttemptId(attempt.id);
    setPhase('in-progress');
  }

  async function handleFinish() {
    if (!attemptId || !assessment.data) return;
    setPhase('submitting');
    try {
      for (const q of assessment.data.questions) {
        if (answers[q.id] !== undefined) {
          await attemptsApi.submitAnswer(attemptId, q.id, answers[q.id]);
        }
      }
      const finished = await attemptsApi.submit(attemptId);
      setResult(finished);
      setPhase('done');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit your answers — try again.');
      setPhase('in-progress');
    }
  }

  if (assessment.loading) return <Skeleton className="mx-auto h-96 max-w-2xl" />;
  if (!assessment.data) return null;

  if (phase === 'preview') {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>{assessment.data.title}</CardTitle>
          <CardDescription>{assessment.data.questions.length} questions</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleStart} className="w-full">
            Start
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (phase === 'done' && result) {
    const gradingStillRunning = result.status === 'GRADING';
    return (
      <Card className="mx-auto max-w-lg text-center">
        <CardHeader>
          <CardTitle>{gradingStillRunning ? 'Submitted!' : 'Nice work!'}</CardTitle>
          <CardDescription>
            {gradingStillRunning
              ? "Jojo is still grading one of your answers — your score will update in a moment."
              : `You scored ${result.score} out of ${result.maxScore}`}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => router.push('/student')}>
            Back to dashboard
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-foreground">{assessment.data.title}</h1>
      {assessment.data.questions.map((q, i) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {i + 1}. {q.promptMarkdown}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {q.type === 'MULTIPLE_CHOICE' && q.choices ? (
              <div className="space-y-2">
                {q.choices.map((choice) => (
                  <label
                    key={choice.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-sm has-[:checked]:border-secondary has-[:checked]:bg-secondary/5"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={choice.id}
                      checked={answers[q.id] === choice.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: choice.id }))}
                      className="h-4 w-4 accent-secondary"
                    />
                    {choice.label}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Type your answer…"
                value={(answers[q.id] as string) ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </CardContent>
        </Card>
      ))}
      <Button onClick={handleFinish} disabled={phase === 'submitting'} className="w-full" size="lg">
        {phase === 'submitting' ? 'Submitting…' : 'Submit quiz'}
      </Button>
    </div>
  );
}
