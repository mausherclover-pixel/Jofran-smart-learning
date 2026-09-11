'use client';

import { useEffect } from 'react';
import { bootstrapSession } from '@/lib/auth';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    bootstrapSession();
  }, []);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
