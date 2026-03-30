import React from 'react';
import { cn } from '@/lib/utils';
import ModuleBreadcrumb from './ModuleBreadcrumb';

interface ModuleLayoutProps {
  title: string;
  description?: string;
  breadcrumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-6 animate-fade-in', className)}>
      <ModuleBreadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {children}
    </div>
  );
};

export default ModuleLayout;
