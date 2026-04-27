import { useState } from "react";
import { Clock, User, Scissors, MessageCircle, CheckCircle, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Appointment, AppointmentStatus } from "@/types/barbershop";
import { ConcludeDialog } from "./ConcludeDialog";
import { ManageAppointmentDialog } from "./ManageAppointmentDialog";
import { useAppointments } from "@/context/AppointmentContext";
import { cn } from "@/lib/utils";

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  agendado: { label: "Agendado", className: "bg-warning/20 text-warning border-warning/30" },
  confirmado: { label: "Confirmado", className: "bg-primary/20 text-primary border-primary/30" },
  atendido: { label: "Atendido", className: "bg-success/20 text-success border-success/30" },
  faltou: { label: "Faltou", className: "bg-destructive/20 text-destructive border-destructive/30" },
  cancelado: { label: "Cancelado", className: "bg-muted text-muted-foreground border-muted" },
};

interface AppointmentCardProps {
  appointment: Appointment;
  onWhatsApp?: () => void;
  onClick?: () => void;
}

export function AppointmentCard({ appointment, onWhatsApp, onClick }: AppointmentCardProps) {
  const status = statusConfig[appointment.status];
  const [concludeOpen, setConcludeOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { concludeAppointment } = useAppointments();

  const canConclude = appointment.status === "agendado" || appointment.status === "confirmado";
  const canManage = appointment.status === "agendado" || appointment.status === "confirmado";

  return (
    <>
      <div 
        onClick={onClick}
        className="glass rounded-xl p-4 space-y-3 cursor-pointer glass-hover animate-slide-up"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold text-lg">{appointment.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", status.className)}>
              {status.label}
            </Badge>
            {canManage && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => { e.stopPropagation(); setManageOpen(true); }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.client?.name || "Cliente"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.service?.name || "Serviço"}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-primary font-medium">
              R$ {appointment.service?.price?.toFixed(2) || "0.00"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {appointment.barber?.name || "Barbeiro"}
          </span>
          <div className="flex items-center gap-1">
            {canConclude && (
              <Button 
                variant="success" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); setConcludeOpen(true); }}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Concluir
              </Button>
            )}
            {onWhatsApp && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
                className="text-success hover:text-success hover:bg-success/10"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>

      <ConcludeDialog
        open={concludeOpen}
        onOpenChange={setConcludeOpen}
        serviceName={appointment.service?.name || "Serviço"}
        servicePrice={appointment.service?.price || 0}
        onConfirm={(method, products) => concludeAppointment(appointment.id, method, products)}
      />

      <ManageAppointmentDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        appointment={appointment}
      />
    </>
  );
}
