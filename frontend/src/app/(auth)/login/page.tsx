'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { login, homePathForRole } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      toast.success(`Welcome back, ${user.fullName}`);
      router.push(homePathForRole(user.role));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/logo.jpg" alt="Jofran E-Learning" width={64} height={64} className="mb-2 rounded-xl" />
          <CardTitle>Log in to Jofran</CardTitle>
          <CardDescription>Students use a school username; everyone else uses email.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Username or email</Label>
              <Input
                id="identifier"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="delfina.s or you@school.tl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs uppercase text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>

          <div className="space-y-2">
            <Button variant="outline" className="w-full" asChild>
              <a href={`${API_BASE_URL}/auth/google`}>Continue with Google</a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={`${API_BASE_URL}/auth/microsoft`}>Continue with Microsoft</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
