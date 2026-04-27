import { useState, useRef } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, Check, Scissors, Copy, ExternalLink, MessageCircle, Loader2, Smartphone, CalendarCog } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgendaConfigTab } from "@/components/settings/AgendaConfigTab";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Configuracoes() {
  const { barbershop, bookingUrl, updateBarbershop, isOwner } = useBarbershop();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect to dashboard if not owner
  if (!isOwner) {
    toast({
      title: "Acesso negado",
      description: "Esta página está disponível apenas para o proprietário da barbearia.",
      variant: "destructive",
    });
    navigate("/dashboard");
    return null;
  }

  const [name, setName] = useState(barbershop?.name || "");
  const [logoPreview, setLogoPreview] = useState<string | null>(barbershop?.logoUrl || null);
  const [saving, setSaving] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [pixReceiverName, setPixReceiverName] = useState("");
  const [loadingPix, setLoadingPix] = useState(true);

  // Load pix settings
  useEffect(() => {
    if (!barbershop) return;
    supabase.from("barbershops").select("pix_key, pix_key_type, pix_receiver_name").eq("id", barbershop.id).maybeSingle().then(({ data }) => {
      if (data) {
        setPixKey((data as any).pix_key || "");
        setPixKeyType((data as any).pix_key_type || "cpf");
        setPixReceiverName((data as any).pix_receiver_name || "");
      }
      setLoadingPix(false);
    });
  }, [barbershop]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione um arquivo de imagem.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe o nome da barbearia.", variant: "destructive" });
      return;
    }
    setSaving(true);
    await updateBarbershop({ name: name.trim(), logo_url: logoPreview });
    // Save pix settings directly
    if (barbershop) {
      await supabase.from("barbershops").update({
        pix_key: pixKey.trim() || null,
        pix_key_type: pixKeyType,
        pix_receiver_name: pixReceiverName.trim() || null,
      } as any).eq("id", barbershop.id);
    }
    setSaving(false);
    toast({ title: "Salvo com sucesso! ✅", description: "As informações da barbearia foram atualizadas." });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast({ title: "Link copiado! 📋" });
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(`Olá! Agende seu horário na ${barbershop?.name} pelo link:\n${bookingUrl}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  return (
    <PageLayout title="Configurações">
      <div className="p-4 space-y-6">
        <Tabs defaultValue="admin" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="admin" className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Admin</TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-2"><CalendarCog className="h-4 w-4" /> Agenda</TabsTrigger>
            <TabsTrigger value="pix" className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Pix</TabsTrigger>
          </TabsList>

          <TabsContent value="admin" className="mt-6 space-y-6">
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-base">Logo da Barbearia</h3>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/30">
                  <AvatarImage src={logoPreview || undefined} alt="Logo" />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl"><Scissors className="h-8 w-8" /></AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" /> Enviar Logo</Button>
                  {logoPreview && <Button variant="ghost" size="sm" onClick={() => setLogoPreview(null)} className="text-destructive text-xs">Remover</Button>}
                  <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Máx 2MB.</p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-base">Informações da Barbearia</h3>
              <div className="space-y-2">
                <Label htmlFor="barbershop-name">Nome da Barbearia</Label>
                <Input id="barbershop-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Barbearia do João" className="h-12 bg-secondary" />
              </div>
            </div>

            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-base">Link de Agendamento Online</h3>
              <p className="text-sm text-muted-foreground">Compartilhe este link com seus clientes.</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={bookingUrl} className="h-12 bg-secondary text-sm font-mono" onClick={handleCopyLink} />
                <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={handleCopyLink}><Copy className="h-4 w-4" /></Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open(bookingUrl, "_blank")}><ExternalLink className="h-4 w-4" /> Abrir Link</Button>
                <Button variant="outline" size="sm" className="gap-2 text-success hover:text-success" onClick={handleShareWhatsApp}><MessageCircle className="h-4 w-4" /> Enviar via WhatsApp</Button>
              </div>
            </div>

            <Button variant="gold" size="lg" className="w-full gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Salvar Alterações
            </Button>
          </TabsContent>

          <TabsContent value="agenda" className="mt-6">
            <AgendaConfigTab />
          </TabsContent>

          <TabsContent value="pix" className="mt-6 space-y-6">
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-base">Chave Pix</h3>
              <p className="text-sm text-muted-foreground">Configure sua chave Pix para receber pagamentos dos clientes.</p>

              <div className="space-y-2">
                <Label>Tipo da Chave</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType}>
                  <SelectTrigger className="h-12 bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Chave Pix</Label>
                <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Digite sua chave Pix" className="h-12 bg-secondary" />
              </div>

              <div className="space-y-2">
                <Label>Nome do Recebedor</Label>
                <Input value={pixReceiverName} onChange={(e) => setPixReceiverName(e.target.value)} placeholder="Nome que aparecerá no Pix" className="h-12 bg-secondary" />
              </div>
            </div>

            <Button variant="gold" size="lg" className="w-full gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Salvar Configurações Pix
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}