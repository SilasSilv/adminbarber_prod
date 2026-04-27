import { BookingService } from "@/data/mockBookingData";
import { cn } from "@/lib/utils";
import { Scissors } from "lucide-react";

interface ServiceStepProps {
  services: BookingService[];
  selectedId: string | null;
  onSelect: (service: BookingService) => void;
}

export function ServiceStep({ services, selectedId, onSelect }: ServiceStepProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Escolha o serviço</h2>
      <div className="grid gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left",
              selectedId === service.id
                ? "border-primary bg-primary/10 shadow-md"
                : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              selectedId === service.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Scissors className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{service.name}</p>
              <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
            </div>
            <p className="font-semibold text-primary text-lg">
              R$ {service.price.toFixed(2)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
