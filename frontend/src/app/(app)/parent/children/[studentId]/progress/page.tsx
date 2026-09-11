'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useApiData } from '@/hooks/use-api-data';
import { studentsApi } from '@/lib/api/students';
import { reportsApi } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MasteryChart } from '@/components/charts/mastery-chart';

export default function ChildProgressPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);

  const progress = useApiData(() => studentsApi.getProgress(studentId), [studentId]);
  const reports = useApiData(() => reportsApi.listForStudent(studentId), [studentId]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/parent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to children
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Mastery by skill</CardTitle>
          <CardDescription>Updated after every quiz attempt</CardDescription>
        </CardHeader>
        <CardContent>
          {progress.loading && <Skeleton className="h-64 w-full" />}
          {progress.data && progress.data.length > 0 && (
            <MasteryChart data={progress.data.map((p) => ({ name: p.skill.name, mastery: p.mastery }))} />
          )}
          {progress.data?.length === 0 && <p className="text-sm text-muted-foreground">No attempts recorded yet.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly reports</CardTitle>
          <CardDescription>Generated every night — see architecture §09</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.loading && <Skeleton className="h-12 w-full" />}
          {reports.data?.length === 0 && <p className="text-sm text-muted-foreground">No reports generated yet.</p>}
          {reports.data?.map((r) => (
            <div key={r.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                </span>
                <span className="text-muted-foreground">
                  {r.summary.attemptsCompleted} attempts
                  {r.summary.averageScore != null ? ` · ${Math.round(r.summary.averageScore * 100)}% avg` : ''}
                </span>
              </div>
              {r.narrative && <p className="text-muted-foreground">{r.narrative}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
