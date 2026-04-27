import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreatedClient {
  id: string;
  name: string;
  whatsapp: string;
}

interface CreateClientDialogProps {
  barbershopId: string;
  onClientCreated: (client: CreatedClient) => void;
}

export function CreateClientDialog({ barbershopId, onClientCreated }: CreateClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim() || !whatsapp.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from("clients")
      .insert({
        barbershop_id: barbershopId,
        name: name.trim(),
        whatsapp: whatsapp.trim(),
      })
      .select("id, name, whatsapp")
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
      return;
    }

    onClientCreated(data);
    setName("");
    setWhatsapp("");
    setOpen(false);
    toast({ title: "Cliente criado! ✅" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full text-sm gap-2">
          <UserPlus className="h-4 w-4" />
          Cadastrar novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Preencha os dados do cliente para cadastrá-lo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder="Nome do cliente"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-secondary"
            />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input
              placeholder="(11) 99999-9999"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="h-12 bg-secondary"
            />
          </div>
          <Button
            variant="gold"
            className="w-full"
            onClick={handleCreate}
            disabled={saving || !name.trim() || !whatsapp.trim()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar e Selecionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
