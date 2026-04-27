import { useState } from "react";
import { Plus, Search, Phone, Loader2, Pencil, User } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ClientRow {
  id: string;
  name: string;
  whatsapp: string;
  notes: string | null;
  created_at: string;
}

export default function Clientes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null);
  const { barbershop } = useBarbershop();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery<ClientRow[]>({
    queryKey: ["clients", barbershop?.id],
    queryFn: async () => {
      if (!barbershop) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, whatsapp, notes, created_at")
        .eq("barbershop_id", barbershop.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClientRow[];
    },
    enabled: !!barbershop,
  });

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.whatsapp.includes(searchQuery)
  );

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  const handleSave = async () => {
    if (!barbershop || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("clients").insert({
      barbershop_id: barbershop.id,
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cliente salvo! ✅" });
    queryClient.invalidateQueries({ queryKey: ["clients", barbershop.id] });
    setDialogOpen(false);
    setName("");
    setWhatsapp("");
    setNotes("");
  };

  const handleEditClick = (client: ClientRow) => {
    setEditingClient(client);
    setName(client.name);
    setWhatsapp(client.whatsapp);
    setNotes(client.notes || "");
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!barbershop || !editingClient || !name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update({
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        notes: notes.trim() || null,
      })
      .eq("id", editingClient.id)
      .eq("barbershop_id", barbershop.id);
    
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cliente atualizado! ✅" });
    queryClient.invalidateQueries({ queryKey: ["clients", barbershop.id] });
    setEditDialogOpen(false);
    setEditingClient(null);
    setName("");
    setWhatsapp("");
    setNotes("");
  };

  return (
    <PageLayout title="Clientes">
      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-secondary"
          />
        </div>

        <Button variant="gold" size="lg" onClick={() => setDialogOpen(true)} className="w-full">
          <Plus className="h-5 w-5 mr-2" /> Novo Cliente
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="glass rounded-xl p-4 flex items-center justify-between cursor-pointer glass-hover animate-fade-in"
              >
                <div className="flex-1 min-w-0" onClick={() => handleEditClick(client)}>
                  <h3 className="font-semibold truncate">{client.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{client.whatsapp}</p>
                  {client.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{client.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); handleWhatsApp(client.whatsapp); }}
                    className="text-success hover:text-success hover:bg-success/10"
                    title="Enviar WhatsApp"
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => { e.stopPropagation(); handleEditClick(client); }}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                    title="Editar cliente"
                  >
                    <Pencil className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nome *</Label>
              <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" className="h-12 bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-whatsapp">WhatsApp</Label>
              <Input id="client-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="11999998888" className="h-12 bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-notes">Observações</Label>
              <Textarea id="client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente" className="bg-secondary min-h-[100px]" />
            </div>
            <Button variant="gold" className="w-full" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-client-name">Nome *</Label>
              <Input id="edit-client-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do cliente" className="h-12 bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-whatsapp">WhatsApp</Label>
              <Input id="edit-client-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="11999998888" className="h-12 bg-secondary" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-client-notes">Observações</Label>
              <Textarea id="edit-client-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas sobre o cliente" className="bg-secondary min-h-[100px]" />
            </div>
            <Button variant="gold" className="w-full" onClick={handleUpdate} disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Atualizar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
