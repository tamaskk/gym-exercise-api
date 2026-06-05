import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Gym Exercise & Workout-Task API',
  description:
    'Next.js API mirroring & extending the ExerciseDB v1 dataset. Data © AscendAPI.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          background: '#0b0f17',
          color: '#e6edf3',
        }}
      >
        {children}
      </body>
    </html>
  );
}
