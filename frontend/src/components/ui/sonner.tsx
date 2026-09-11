'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'bg-card text-card-foreground border border-border shadow-md',
          description: 'text-muted-foreground',
        },
      }}
    />
  );
}
