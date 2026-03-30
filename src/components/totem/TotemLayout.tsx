import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TotemLayoutProps {
  children: ReactNode;
  className?: string;
}

export function TotemLayout({ children, className }: TotemLayoutProps) {
  return (
    <div
      className={cn(
        'min-h-screen bg-gradient-to-b from-[#662E8E] to-[#4a2268]',
        'flex flex-col items-center justify-center',
        'p-2 md:p-4',
        className
      )}
    >
      <div className="w-full max-w-md mx-auto">
        {children}
      </div>
    </div>
  );
}
