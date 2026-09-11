'use client';

import { useAuthStore } from '@/store/auth-store';
import { useApiData } from '@/hooks/use-api-data';
import { studentsApi } from '@/lib/api/students';
import { reportsApi } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MasteryChart } from '@/components/charts/mastery-chart';

export default function MyProgressPage() {
  const user = useAuthStore((s) => s.user)!;
  const progress = useApiData(() => studentsApi.getProgress(user.id), [user.id]);
  const reports = useApiData(() => reportsApi.listForStudent(user.id), [user.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My progress</h1>
        <p className="text-muted-foreground">The same report your parent and teacher can see.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mastery by skill</CardTitle>
        </CardHeader>
        <CardContent>
          {progress.loading && <Skeleton className="h-64 w-full" />}
          {progress.data && progress.data.length > 0 && (
            <MasteryChart data={progress.data.map((p) => ({ name: p.skill.name, mastery: p.mastery }))} />
          )}
          {progress.data?.length === 0 && <p className="text-sm text-muted-foreground">Take a quiz to see your progress here.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly reports</CardTitle>
          <CardDescription>Sent to your parent every week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.loading && <Skeleton className="h-12 w-full" />}
          {reports.data?.length === 0 && <p className="text-sm text-muted-foreground">Your first report will appear after this week.</p>}
          {reports.data?.map((r) => (
            <div key={r.id} className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">
                  {new Date(r.periodStart).toLocaleDateString()} – {new Date(r.periodEnd).toLocaleDateString()}
                </span>
                <span className="text-muted-foreground">{r.summary.attemptsCompleted} attempts</span>
              </div>
              {r.narrative && <p className="text-muted-foreground">{r.narrative}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
