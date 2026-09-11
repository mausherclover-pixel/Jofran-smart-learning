'use client';

import Link from 'next/link';
import { useApiData } from '@/hooks/use-api-data';
import { parentsApi } from '@/lib/api/parents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function ParentDashboardPage() {
  const dashboard = useApiData(() => parentsApi.getDashboard());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Your children</h1>
        <p className="text-muted-foreground">One card per child — the same summary Jofran sends in your weekly report.</p>
      </div>

      {dashboard.loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {dashboard.error && <p className="text-sm text-destructive">Couldn't load your children right now: {dashboard.error}</p>}

      {dashboard.data?.children.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No children are linked to your account yet — ask your child's teacher or school administrator to link you.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboard.data?.children.map((child) => {
          const masteryPercent = child.averageMastery != null ? Math.round(child.averageMastery * 100) : null;
          return (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="text-lg">{child.fullName}</CardTitle>
                <CardDescription>{child.className ? `Grade ${child.grade} — ${child.className}` : 'Not yet enrolled in a class'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall mastery</span>
                    <span className="font-medium text-foreground">{masteryPercent != null ? `${masteryPercent}%` : '—'}</span>
                  </div>
                  <Progress value={masteryPercent ?? 0} />
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={child.pendingAssessments > 0 ? 'warning' : 'success'}>
                    {child.pendingAssessments > 0 ? `${child.pendingAssessments} pending` : 'All caught up'}
                  </Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/parent/children/${child.id}/progress`}>View progress</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
