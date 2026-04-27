import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Clock, DollarSign, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBarbershop } from "@/context/BarbershopContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  active: boolean;
}

export default function Servicos() {
  const { barbershop } = useBarbershop();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de criação
  const [openCreate, setOpenCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formDuration, setFormDuration] = useState("30");
  const [saving, setSaving] = useState(false);

  // Modal de edição
  const [openEdit, setOpenEdit] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("30");
  const [updating, setUpdating] = useState(false);

  // Confirmação de exclusão (inativação)
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchServices = async () => {
    if (!barbershop) return;
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
      .order("created_at", { ascending: false });
    setServices((data || []).map(s => ({ ...s, price: Number(s.price) })));
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, [barbershop]);

  const handleCreate = async () => {
    if (!barbershop || !formName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("services").insert({
      barbershop_id: barbershop.id, // CRITICAL: set barbershop_id
      name: formName.trim(),
      price: parseFloat(formPrice) || 0,
      duration_minutes: parseInt(formDuration) || 30,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço criado! ✅" });
      setFormName(""); setFormPrice(""); setFormDuration("30");
      setOpenCreate(false);
      fetchServices();
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setEditName(service.name);
    setEditPrice(service.price.toString());
    setEditDuration(service.duration_minutes.toString());
    setOpenEdit(true);
  };

  const handleUpdate = async () => {
    if (!editingService || !editName.trim()) return;
    setUpdating(true);
    const { error } = await supabase
      .from("services")
      .update({
        name: editName.trim(),
        price: parseFloat(editPrice) || 0,
        duration_minutes: parseInt(editDuration) || 30,
      })
      .eq("id", editingService.id);
    setUpdating(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço atualizado! ✅" });
      setOpenEdit(false);
      setEditingService(null);
      fetchServices();
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase
      .from("services")
      .update({ active: false })
      .eq("id", deleteId);
    setDeleting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Serviço desativado ✅" });
    }
    fetchServices();
    setDeleteId(null);
  };

  return (
    <PageLayout title="Serviços">
      <div className="p-4 space-y-4">
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button variant="gold" size="lg" className="w-full">
              <Plus className="h-5 w-5 mr-2" /> Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Serviço</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Corte masculino" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input type="number" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" value={formDuration} onChange={e => setFormDuration(e.target.value)} placeholder="30" />
                </div>
              </div>
              <Button variant="gold" className="w-full" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Edição */}
        <Dialog open={openEdit} onOpenChange={setOpenEdit}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Serviço</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Corte masculino" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="50" />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" value={editDuration} onChange={e => setEditDuration(e.target.value)} placeholder="30" />
                </div>
              </div>
              <Button variant="gold" className="w-full" onClick={handleUpdate} disabled={updating}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmação de Inativação */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar serviço</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja desativar este serviço? A desativação remove o serviço da venda, mas mantém o registro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Desativando...
                  </>
                ) : (
                  "Desativar"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            {services.map((service, index) => (
              <div key={service.id} className="glass rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{service.name}</h3>
                    <Badge variant="outline" className={cn("mt-1", service.active ? "bg-success/20 text-success border-success/30" : "bg-muted text-muted-foreground")}>
                      {service.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleEditClick(service)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteClick(service.id)} title="Desativar" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Clock className="h-4 w-4" /><span>{service.duration_minutes} min</span></div>
                  <div className="flex items-center gap-1"><DollarSign className="h-4 w-4" /><span>R$ {service.price.toFixed(2)}</span></div>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}