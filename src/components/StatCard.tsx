import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  className?: string;
}

export function StatCard({ title, value, icon, className }: StatCardProps) {
  return (
    <div className={cn("glass rounded-xl p-4 animate-fade-in", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
      </div>
    </div>
  );
}