'use client';

import { use } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useApiData } from '@/hooks/use-api-data';
import { curriculumApi } from '@/lib/api/curriculum';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const user = useAuthStore((s) => s.user)!;
  const lesson = useApiData(() => curriculumApi.getLesson(lessonId, user.locale), [lessonId, user.locale]);

  const variant = lesson.data?.variants[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {lesson.loading && (
        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}

      {lesson.error && <p className="text-sm text-destructive">Couldn't load this lesson: {lesson.error}</p>}

      {variant && (
        <Card>
          <CardHeader>
            <Badge variant="outline" className="w-fit">
              Grade {lesson.data?.unit.subject.grade} · {lesson.data?.unit.subject.slug.replace(/-/g, ' ')}
            </Badge>
            <CardTitle className="text-2xl">{variant.title}</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-4 text-foreground">
            {variant.bodyMarkdown.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {lesson.data && !variant && (
        <p className="text-sm text-muted-foreground">This lesson isn't translated into your language yet — ask your teacher.</p>
      )}
    </div>
  );
}
