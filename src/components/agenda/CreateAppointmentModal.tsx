import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Zap, Loader2, Search } from "lucide-react";
import type { EditableService, EditableProfessional } from "./EditAppointmentModal";
import { supabase } from "@/integrations/supabase/client";

interface ClientRow {
  id: string;
  name: string;
  whatsapp: string;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

interface CreateAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTime: string;
  date: string;
  barbershopId: string;
  services: EditableService[];
  professionals: EditableProfessional[];
  onSave: (data: {
    client_name: string;
    client_phone: string;
    service_id: string;
    professional_id: string;
    start_time: string;
    end_time: string;
    is_encaixe: boolean;
  }) => void;
}

export function CreateAppointmentModal({
  open,
  onOpenChange,
  defaultTime,
  date,
  barbershopId,
  services,
  professionals,
  onSave,
}: CreateAppointmentModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [startTime, setStartTime] = useState(defaultTime);
  const [isEncaixe, setIsEncaixe] = useState(false);
  const [endTime, setEndTime] = useState("");

  // Client autocomplete states
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredClients, setFilteredClients] = useState<ClientRow[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset form when modal opens
    setClientName("");
    setClientPhone("");
    setServiceId("");
    setProfessionalId("");
    setStartTime(defaultTime);
    setIsEncaixe(false);
    setEndTime("");
    setSearchQuery("");
    setShowClientDropdown(false);
    setIsCreatingClient(false);
    setNewClientName("");
    setNewClientPhone("");
  }, [open, defaultTime]);

  // Load clients for autocomplete
  useEffect(() => {
    if (!open) return;
    const fetchClients = async () => {
      setLoadingClients(true);
      const { data } = await supabase
        .from("clients")
        .select("id, name, whatsapp")
        .order("name");
      setClients((data || []).map(c => ({ id: c.id, name: c.name, whatsapp: c.whatsapp })));
      setLoadingClients(false);
    };
    fetchClients();
  }, [open]);

  // Filter clients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(c => 
      c.name.toLowerCase().includes(query) || c.whatsapp.includes(query)
    );
    setFilteredClients(filtered);
  }, [searchQuery, clients]);

  useEffect(() => {
    if (!serviceId || !startTime) return;
    const svc = services.find((s) => s.id === serviceId);
    if (svc) setEndTime(addMinutesToTime(startTime, svc.duration_minutes));
  }, [serviceId, startTime, services]);

  const handleClientSelect = (client: ClientRow) => {
    setClientName(client.name);
    setClientPhone(client.whatsapp);
    setSearchQuery(client.name);
    setShowClientDropdown(false);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) return;
    setCreatingClient(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        barbershop_id: barbershopId,
        name: newClientName.trim(),
        whatsapp: newClientPhone.trim(),
      })
      .select("id, name, whatsapp")
      .single();

    if (!error) {
      // Automatically select the newly created client
      handleClientSelect(data);
      // Clear the new client form
      setNewClientName("");
      setNewClientPhone("");
      // Close the new client creation form
      setIsCreatingClient(false);
    }
    setCreatingClient(false);
  };

  const handleSave = () => {
    if (!clientName || !clientPhone || !serviceId || !professionalId || !startTime || !endTime) return;
    onSave({
      client_name: clientName,
      client_phone: clientPhone,
      service_id: serviceId,
      professional_id: professionalId,
      start_time: startTime,
      end_time: endTime,
      is_encaixe: isEncaixe,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Client field with autocomplete */}
          <div className="space-y-2 relative">
            <Label>Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setClientName(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                className="pl-10 h-12 bg-secondary"
              />
            </div>
            {showClientDropdown && (searchQuery || clientName) && (
              <div className="absolute z-50 w-full mt-1 max-h-40 overflow-y-auto border border-border rounded-md bg-secondary shadow-lg">
                {loadingClients ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClients.length > 0 ? (
                  filteredClients.map((c) => (
                    <Button
                      key={c.id}
                      variant="ghost"
                      className="w-full text-left justify-start text-sm"
                      onClick={() => handleClientSelect(c)}
                    >
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.whatsapp}</span>
                      </div>
                    </Button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    Nenhum cliente encontrado
                  </div>
                )}
              </div>
            )}
            {!isCreatingClient && (
              <Button 
                variant="outline"                 size="sm" 
                onClick={() => setIsCreatingClient(true)}
                className="w-full mt-2 text-xs"
              >
                + Cadastrar novo cliente              </Button>
            )}
          </div>

          {/* New client form */}
          {isCreatingClient && (
            <div className="space-y-3 p-3 border border-border rounded-lg bg-secondary/30 animate-fade-in">
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="h-10 bg-secondary"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="h-10 bg-secondary"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsCreatingClient(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="gold" 
                  size="sm"                   onClick={handleCreateClient}
                  disabled={!newClientName.trim() || !newClientPhone.trim() || creatingClient}
                  className="flex-1"
                >
                  {creatingClient ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Criar"}
                </Button>
              </div>
            </div>
          )}

          {/* Phone field - REMOVED DISABLED STATE */}
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input 
              value={clientPhone} 
              onChange={(e) => setClientPhone(e.target.value)} 
              placeholder="(00) 00000-0000" 
              className="h-12 bg-secondary"
            />
          </div>

          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger className="h-12 bg-secondary">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.duration_minutes}min - R${s.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={setProfessionalId}>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Horário início</Label>
              <Input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)} 
                className="h-12 bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Horário fim</Label>
              <Input                 type="time" 
                value={endTime} 
                disabled 
                className="opacity-70 h-12 bg-secondary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Zap className="h-4 w-4 text-warning shrink-0" />
            <Label htmlFor="encaixe" className="flex-1 cursor-pointer">Agendamento de encaixe</Label>
            <Switch 
              id="encaixe" 
              checked={isEncaixe} 
              onCheckedChange={setIsEncaixe} 
            />
          </div>
        </div>
        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button             onClick={handleSave} 
            disabled={!clientName || !clientPhone || !serviceId || !professionalId || !endTime}
          >
            Criar Agendamento          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}