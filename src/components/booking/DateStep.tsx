import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";

interface DateStepProps {
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
}

export function DateStep({ selectedDate, onSelect }: DateStepProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Escolha a data</h2>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          disabled={(date) => date < today}
          locale={ptBR}
          className={cn("p-3 pointer-events-auto rounded-xl border border-border bg-card")}
        />
      </div>
    </div>
  );
}
