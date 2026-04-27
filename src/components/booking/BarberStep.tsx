import { BookingBarber } from "@/data/mockBookingData";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface BarberStepProps {
  barbers: BookingBarber[];
  selectedId: string | null;
  onSelect: (barber: BookingBarber) => void;
}

export function BarberStep({ barbers, selectedId, onSelect }: BarberStepProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Escolha o profissional</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {barbers.map((barber) => (
          <button
            key={barber.id}
            onClick={() => onSelect(barber)}
            className={cn(
              "flex flex-col items-center gap-3 p-5 rounded-xl border transition-all duration-200",
              selectedId === barber.id
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              selectedId === barber.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <User className="w-7 h-7" />
            </div>
            <p className="font-medium text-foreground text-sm text-center">{barber.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
