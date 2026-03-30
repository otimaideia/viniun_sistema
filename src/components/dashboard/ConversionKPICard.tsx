import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ConversionKPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  className?: string;
  isPercentage?: boolean;
}

export function ConversionKPICard({ 
  title, 
  value, 
  icon: Icon, 
  className,
  isPercentage = true
}: ConversionKPICardProps) {
  const displayValue = isPercentage 
    ? `${value.toFixed(1)}%` 
    : Number.isInteger(value) ? value.toString() : value.toFixed(1);
  
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 transition-all duration-200 hover:shadow-card group",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/15 transition-colors">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {displayValue}
        </p>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
