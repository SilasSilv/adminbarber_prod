import { BookingService, BookingBarber } from "@/data/mockBookingData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Scissors, User, CalendarDays, Clock, Phone } from "lucide-react";

interface ConfirmStepProps {
  service: BookingService;
  barber: BookingBarber;
  date: Date;
  time: string;
  clientName: string;
  clientPhone: string;
}

export function ConfirmStep({ service, barber, date, time, clientName, clientPhone }: ConfirmStepProps) {
  const items = [
    { icon: Scissors, label: "Serviço", value: `${service.name} — R$ ${service.price.toFixed(2)}` },
    { icon: User, label: "Profissional", value: barber.name },
    { icon: CalendarDays, label: "Data", value: format(date, "EEEE, dd 'de' MMMM", { locale: ptBR }) },
    { icon: Clock, label: "Horário", value: time },
    { icon: User, label: "Nome", value: clientName },
    { icon: Phone, label: "Telefone", value: clientPhone },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Confirme seu agendamento</h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {items.map(({ icon: Icon, label, value }, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Icon className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground truncate">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
