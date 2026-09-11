'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { useApiData } from '@/hooks/use-api-data';
import { teachersApi } from '@/lib/api/teachers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function TeacherDashboardPage() {
  const classes = useApiData(() => teachersApi.myClasses());
  const pending = useApiData(() => teachersApi.pendingGrading());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Your classes</h1>
        <p className="text-muted-foreground">Grading queue and class rosters for your assigned classes only.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.loading && <Skeleton className="h-32 w-full sm:col-span-2 lg:col-span-3" />}
        {classes.data?.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                {c.name}
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Grade {c.grade}</span>
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {c._count?.enrollments ?? 0} students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/teacher/classes/${c.id}`}>View class</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {classes.data?.length === 0 && <p className="text-sm text-muted-foreground">No classes assigned yet.</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grading queue</CardTitle>
          <CardDescription>Submitted attempts waiting on a grade — auto-graded and AI-graded items never appear here</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.loading && <Skeleton className="h-24 w-full" />}
          {pending.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing pending — you're caught up.</p>}
          {pending.data && pending.data.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.student.fullName}</TableCell>
                    <TableCell>{item.assessment.title}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">Jojo is grading…</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
