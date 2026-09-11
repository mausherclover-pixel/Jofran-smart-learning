'use client';

import { useApiData } from '@/hooks/use-api-data';
import { adminApi } from '@/lib/api/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperAdminSchoolsPage() {
  const schools = useApiData(() => adminApi.listSchools());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Schools</h1>
        <p className="text-muted-foreground">Platform-wide — the one view no other role can see.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All schools</CardTitle>
          <CardDescription>{schools.data?.length ?? '—'} on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {schools.loading && <Skeleton className="h-40 w-full" />}
          {schools.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Municipality</TableHead>
                  <TableHead>Plan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schools.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-foreground">{s.name}</TableCell>
                    <TableCell>{s.municipality}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.plan}</Badge>
                    </TableCell>
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
