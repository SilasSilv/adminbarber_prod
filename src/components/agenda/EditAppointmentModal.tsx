import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { AgendaAppointment } from "./AgendaTimelineCard";

export interface EditableService {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

export interface EditableProfessional {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "em_atendimento", label: "Em atendimento" },
  { value: "atendido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
  { value: "faltou", label: "Não compareceu" },
];

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

interface EditAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AgendaAppointment | null;
  services: EditableService[];
  professionals: EditableProfessional[];
  onSave: (updated: AgendaAppointment) => void;
  onDelete: (id: string) => void;
}

export function EditAppointmentModal({
  open,
  onOpenChange,
  appointment,
  services,
  professionals,
  onSave,
  onDelete,
}: EditAppointmentModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [status, setStatus] = useState("agendado");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (appointment) {
      setClientName(appointment.client_name);
      setClientPhone(appointment.client_phone);
      setServiceId(appointment.service_id || "");
      setProfessionalId(appointment.professional_id || "");
      setStartTime(appointment.start_time);
      setStatus(appointment.status);
      setEndTime(appointment.end_time);
    }
  }, [appointment]);

  // Recalculate end_time when service or start_time changes
  useEffect(() => {
    if (!serviceId || !startTime) return;
    const svc = services.find((s) => s.id === serviceId);
    if (svc) {
      setEndTime(addMinutesToTime(startTime, svc.duration_minutes));
    }
  }, [serviceId, startTime, services]);

  const handleSave = () => {
    if (!appointment) return;
    const svc = services.find((s) => s.id === serviceId);
    const prof = professionals.find((p) => p.id === professionalId);

    onSave({
      ...appointment,
      client_name: clientName,
      client_phone: clientPhone,
      service_id: serviceId,
      service_name: svc?.name || appointment.service_name,
      professional_id: professionalId,
      professional_name: prof?.name || appointment.professional_name,
      start_time: startTime,
      end_time: endTime,
      status,
      total: svc?.price || appointment.total,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!appointment) return;
    onDelete(appointment.id);
    onOpenChange(false);
  };

  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cliente</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" />
          </div>

          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>

          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes}min)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Horário início</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Horário fim</Label>
              <Input type="time" value={endTime} disabled className="opacity-70" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Alterações</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
