import { cn } from "@/lib/utils";
import { Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimeStepProps {
  slots: string[];
  selectedTime: string | null;
  onSelect: (time: string) => void;
  loading?: boolean;
  occupiedSlots: { time: string; duration: number }[];
}

export function TimeStep({ slots, selectedTime, onSelect, loading, occupiedSlots }: TimeStepProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">Carregando horários...</p>
      </div>
    );
  }

  // Cria um Set com os horários já ocupados para busca rápida
  const occupiedTimeSet = new Set(occupiedSlots.map(s => s.time));

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
        <p className="font-medium text-foreground">Nenhum horário disponível</p>
        <p className="text-sm text-muted-foreground mt-1">Tente outra data ou profissional.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Escolha o horário</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((time) => {
          // Verifica se este horário está ocupado
          const isOccupied = occupiedTimeSet.has(time);
          
          return (
            <button
              key={time}
              onClick={() => !isOccupied && onSelect(time)}
              disabled={isOccupied}
              className={cn(
                "py-3 px-2 rounded-lg border text-sm font-medium transition-all duration-200",
                isOccupied
                  ? "border-border bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                  : selectedTime === time
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-sm"
              )}
            >
              {time}
              {isOccupied && (
                <Badge variant="outline" className="ml-1 text-[10px] py-0 h-4 bg-destructive/10 text-destructive border-destructive/30">
                  Reservado
                </Badge>
              )}
            </button>
          );}
      </div>
    </div>
  );
}