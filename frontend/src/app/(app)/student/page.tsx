'use client';

import Link from 'next/link';
import { BookOpen, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useApiData } from '@/hooks/use-api-data';
import { studentsApi } from '@/lib/api/students';
import { assessmentsApi } from '@/lib/api/assessments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MasteryChart } from '@/components/charts/mastery-chart';

export default function StudentDashboardPage() {
  const user = useAuthStore((s) => s.user)!;

  const profile = useApiData(() => studentsApi.getProfile(user.id), [user.id]);
  const progress = useApiData(() => studentsApi.getProgress(user.id), [user.id]);

  const classId = profile.data?.enrollments[0]?.class.id;
  const assessments = useApiData(() => (classId ? assessmentsApi.listForClass(classId) : Promise.resolve([])), [classId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Hi {user.fullName.split(' ')[0]} 👋</h1>
          <p className="text-muted-foreground">
            {profile.data?.enrollments[0] ? `Grade ${profile.data.enrollments[0].class.grade} — ${profile.data.enrollments[0].class.name}` : 'Loading your class…'}
          </p>
        </div>
        <Button asChild variant="accent">
          <Link href="/student/jojo">
            <Sparkles className="mr-2 h-4 w-4" /> Talk to Jojo
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>Quizzes and homework from your class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assessments.loading && <Skeleton className="h-16 w-full" />}
            {assessments.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing assigned yet — check back soon.</p>}
            {assessments.data?.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a._count?.questions ?? 0} questions
                    {a.dueAt ? ` · due ${new Date(a.dueAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link href={`/quiz/${a.id}`}>Start</Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-secondary" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-secondary">{progress.data?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">skills you've practiced</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My mastery by skill</CardTitle>
          <CardDescription>This is what decides how hard your next question will be</CardDescription>
        </CardHeader>
        <CardContent>
          {progress.loading && <Skeleton className="h-64 w-full" />}
          {progress.data && progress.data.length > 0 && (
            <MasteryChart data={progress.data.map((p) => ({ name: p.skill.name, mastery: p.mastery }))} />
          )}
          {progress.data?.length === 0 && <p className="text-sm text-muted-foreground">Take a quiz to start building your skill profile.</p>}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Badge variant="secondary">Tetum</Badge>
        <Badge variant="outline">English</Badge>
        <Badge variant="outline">Bahasa Indonesia</Badge>
      </div>
    </div>
  );
}
