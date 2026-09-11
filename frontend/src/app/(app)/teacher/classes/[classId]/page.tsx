'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { useApiData } from '@/hooks/use-api-data';
import { classesApi } from '@/lib/api/teachers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ClassRosterPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = use(params);
  const klass = useApiData(() => classesApi.getOne(classId), [classId]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/teacher">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to classes
        </Link>
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{klass.data?.name ?? <Skeleton className="h-8 w-48" />}</h1>
          <p className="text-muted-foreground">{klass.data ? `Grade ${klass.data.grade} · ${klass.data.enrollments.length} students` : ''}</p>
        </div>
        <Button asChild>
          <Link href={`/teacher/classes/${classId}/assessments/new`}>
            <Plus className="mr-2 h-4 w-4" /> New assessment
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {klass.loading && <Skeleton className="h-40 w-full" />}
          {klass.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {klass.data.enrollments.map((e) => (
                  <TableRow key={e.student.id}>
                    <TableCell>{e.student.fullName}</TableCell>
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
