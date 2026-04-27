import { useState } from "react";
import { Clock, XCircle, CheckCircle, UserX, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Appointment } from "@/types/barbershop";
import { useAppointments } from "@/context/AppointmentContext";
import { cn } from "@/lib/utils";

interface ManageAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
}

const timeSlots: string[] = [];
for (let hour = 8; hour <= 20; hour++) {
  timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
  timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
}

export function ManageAppointmentDialog({ open, onOpenChange, appointment }: ManageAppointmentDialogProps) {
  const [view, setView] = useState<"main" | "reschedule">("main");
  const [newTime, setNewTime] = useState("");
  const { updateAppointmentStatus, rescheduleAppointment, isTimeSlotAvailable } = useAppointments();

  const handleStatusChange = (status: "cancelado" | "faltou") => {
    updateAppointmentStatus(appointment.id, status);
    onOpenChange(false);
  };

  const handleReschedule = () => {
    if (!newTime) return;
    const success = rescheduleAppointment(appointment.id, newTime);
    if (success) {
      setView("main");
      setNewTime("");
      onOpenChange(false);
    }
  };

  const availableSlots = timeSlots.filter(
    (t) => t !== appointment.time && isTimeSlotAvailable(appointment.barber_id, appointment.date, t, appointment.id)
  );

  if (view === "reschedule") {
    return (
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setView("main"); }}>
        <DialogContent className="glass border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Alterar Horário
            </DialogTitle>
            <DialogDescription>
              {appointment.client?.name} — {appointment.time}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select value={newTime} onValueChange={setNewTime}>
              <SelectTrigger className="h-12 bg-secondary">
                <SelectValue placeholder="Selecione novo horário" />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.length > 0 ? (
                  availableSlots.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum horário disponível</div>
                )}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("main")}>
                Voltar
              </Button>
              <Button variant="gold" className="flex-1" disabled={!newTime} onClick={handleReschedule}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            Gerenciar Agendamento
          </DialogTitle>
          <DialogDescription>
            {appointment.client?.name} — {appointment.time} — {appointment.service?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => setView("reschedule")}
          >
            <Clock className="h-5 w-5 text-primary" />
            Alterar Horário
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
            onClick={() => handleStatusChange("cancelado")}
          >
            <XCircle className="h-5 w-5" />
            Cancelar Agendamento
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-warning hover:text-warning"
            onClick={() => handleStatusChange("faltou")}
          >
            <UserX className="h-5 w-5" />
            Marcar como Faltou
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
