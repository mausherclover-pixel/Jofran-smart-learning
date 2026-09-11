'use client';

import { GraduationCap, School, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useApiData } from '@/hooks/use-api-data';
import { schoolsApi } from '@/lib/api/schools';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function PrincipalDashboardPage() {
  const user = useAuthStore((s) => s.user)!;
  const staff = useApiData(() => schoolsApi.listStaff(user.schoolId!), [user.schoolId]);
  const classes = useApiData(() => schoolsApi.listClasses(user.schoolId!), [user.schoolId]);

  const teacherCount = staff.data?.filter((u) => u.role === 'TEACHER').length ?? 0;
  const studentCount = classes.data?.reduce((sum, c) => sum + (c._count?.enrollments ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">School overview</h1>
        <p className="text-muted-foreground">Everything in your school — every other role here sees only their own slice.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={School} label="Classes" value={classes.data?.length} loading={classes.loading} />
        <StatCard icon={Users} label="Teachers" value={teacherCount} loading={staff.loading} />
        <StatCard icon={GraduationCap} label="Students" value={studentCount} loading={classes.loading} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
          <CardDescription>Grade, teacher, and roster size for every class this term</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {classes.loading && <Skeleton className="h-32 w-full" />}
          {classes.data?.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-3">
                <Badge variant="outline">Grade {c.grade}</Badge>
                <span className="font-medium text-foreground">{c.name}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{c.teacher?.fullName ?? 'Unassigned'}</span>
                <span>{c._count?.enrollments ?? 0} students</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof School;
  label: string;
  value: number | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          {loading ? <Skeleton className="h-7 w-10" /> : <p className="text-2xl font-bold text-foreground">{value ?? 0}</p>}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
