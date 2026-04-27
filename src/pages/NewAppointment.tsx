import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, User, Scissors, UserCircle, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";
import { CreateClientDialog } from "@/components/booking/CreateClientDialog";

interface ServiceRow { id: string; name: string; price: number; duration_minutes: number; }
interface ProfessionalRow { id: string; name: string; }
interface ClientRow { id: string; name: string; whatsapp: string; }

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);
}

export default function NewAppointment() {
  const navigate = useNavigate();
  const { barbershop } = useBarbershop();
  const { toast } = useToast();

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<{ start_time: string; end_time: string; professional_id: string; is_encaixe: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(false);

  const [formData, setFormData] = useState({
    client_id: "",
    service_id: "",
    professional_id: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    notes: "",
    is_encaixe: false,
  });

  useEffect(() => {
    if (!barbershop) return;
    Promise.all([
      supabase.from("services").select("id, name, price, duration_minutes").eq("barbershop_id", barbershop.id).eq("active", true),
      supabase.from("professionals").select("id, name").eq("barbershop_id", barbershop.id).eq("active", true),
      supabase.from("clients").select("id, name, whatsapp").eq("barbershop_id", barbershop.id).order("name"),
    ]).then(([svcRes, proRes, cliRes]) => {
      setServices((svcRes.data || []) as ServiceRow[]);
      setProfessionals((proRes.data || []) as ProfessionalRow[]);
      setClients((cliRes.data || []) as ClientRow[]);
      setLoading(false);
    });
  }, [barbershop]);

  // Fetch existing appointments when date or professional changes
  useEffect(() => {
    if (!barbershop || !formData.date || !formData.professional_id) {
      setExistingAppointments([]);
      return;
    }
    supabase
      .from("appointments")
      .select("start_time, end_time, professional_id, is_encaixe")
      .eq("barbershop_id", barbershop.id)
      .eq("date", formData.date)
      .eq("professional_id", formData.professional_id)
      .not("status", "in", '("cancelado","faltou")')
      .then(({ data }) => setExistingAppointments((data || []) as any));
  }, [barbershop, formData.date, formData.professional_id]);

  const selectedService = services.find((s) => s.id === formData.service_id);
  const duration = selectedService?.duration_minutes || 30;
  const endTime = formData.time ? addMinutesToTime(formData.time, duration) : "";

  // Check conflict whenever time/service/professional changes
  useEffect(() => {
    if (!formData.time || !formData.professional_id || !selectedService) {
      setConflictWarning(false);
      return;
    }
    const newEnd = addMinutesToTime(formData.time, duration);
    const hasConflict = existingAppointments.some(
      (apt) => timesOverlap(formData.time, newEnd, apt.start_time.substring(0, 5), apt.end_time.substring(0, 5))
    );
    setConflictWarning(hasConflict);
  }, [formData.time, formData.professional_id, selectedService, existingAppointments, duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barbershop || !formData.client_id || !formData.service_id || !formData.professional_id || !formData.date || !formData.time) return;

    // Block if conflict and not encaixe
    if (conflictWarning && !formData.is_encaixe) {
      toast({
        title: "Conflito de horário",
        description: "Já existe um agendamento neste horário. Marque como encaixe para permitir sobreposição.",
        variant: "destructive",
      });
      return;
    }

    const client = clients.find(c => c.id === formData.client_id);

    setSubmitting(true);
    const { error } = await supabase.from("appointments").insert({
      barbershop_id: barbershop.id,
      professional_id: formData.professional_id,
      service_id: formData.service_id,
      date: formData.date,
      start_time: formData.time,
      end_time: endTime,
      client_name: client?.name || "",
      client_phone: client?.whatsapp || "",
      total: selectedService?.price || 0,
      status: "agendado",
      notes: formData.notes || null,
      is_encaixe: formData.is_encaixe,
    });
    setSubmitting(false);

    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sucesso! ✅", description: "Agendamento criado com sucesso." });
    navigate("/agenda");
  };

  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, "0")}:00`);
    timeSlots.push(`${hour.toString().padStart(2, "0")}:30`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Novo Agendamento</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        {/* Client selection - Mobile responsive */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Cliente
          </Label>
          <Select value={formData.client_id} onValueChange={(value) => {
            const selected = clients.find(c => c.id === value);
            setFormData({ ...formData, client_id: value });
            if (selected) {
              // phone is stored in client_phone on submit via clients lookup
            }
          }}>
            <SelectTrigger className="h-12 bg-secondary">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.whatsapp ? `(${c.whatsapp})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {barbershop && (
            <CreateClientDialog
              barbershopId={barbershop.id}
              onClientCreated={(newClient) => {
                setClients(prev => [newClient, ...prev]);
                setFormData(prev => ({ ...prev, client_id: newClient.id }));
              }}
            />
          )}
        </div>

        {/* Service selection - Mobile responsive */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" /> Serviço
          </Label>
          <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
            <SelectTrigger className="h-12 bg-secondary">
              <SelectValue placeholder="Selecione o serviço" />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{s.name}</span>
                    <span className="text-primary font-medium">R$ {Number(s.price).toFixed(2)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedService && (
            <p className="text-sm text-muted-foreground">
              Duração: {selectedService.duration_minutes} minutos
              {endTime && ` • Término: ${endTime}`}
            </p>
          )}
        </div>

        {/* Professional selection - Mobile responsive */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-primary" /> Profissional
          </Label>
          <Select value={formData.professional_id} onValueChange={(value) => setFormData({ ...formData, professional_id: value })}>
            <SelectTrigger className="h-12 bg-secondary">
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

        {/* Date and Time - Mobile responsive */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" /> Data
            </Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="h-12 bg-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Horário
            </Label>
            <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
              <SelectTrigger className="h-12 bg-secondary">
                <SelectValue placeholder="Horário" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Conflict warning - Mobile responsive */}
        {conflictWarning && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 space-y-3">
            <p className="text-sm text-warning font-medium">
              ⚠️ Conflito de horário detectado para este profissional.
            </p>
            <div className="flex items-center justify-between">
              <Label htmlFor="encaixe" className="flex items-center gap-2 text-sm cursor-pointer">
                <Zap className="h-4 w-4 text-warning" />
                Marcar como encaixe
              </Label>
              <Switch
                id="encaixe"
                checked={formData.is_encaixe}
                onCheckedChange={(checked) => setFormData({ ...formData, is_encaixe: checked })}
              />
            </div>
          </div>
        )}

        {/* Notes - Mobile responsive */}
        <div className="space-y-2">
          <Label>Observações (opcional)</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Ex: Cliente prefere máquina 2"
            className="bg-secondary min-h-[100px]"
          />
        </div>

        {/* Submit button - Mobile responsive */}
        <div className="pt-4">
          <Button
            type="submit"
            variant="gold"
            size="xl"
            className="w-full"
            disabled={submitting || (conflictWarning && !formData.is_encaixe)}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Confirmar Agendamento
          </Button>
        </div>
      </form>
    </div>
  );
}