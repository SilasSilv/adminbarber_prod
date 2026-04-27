import { useState, useEffect } from "react";
import { ArrowLeft, Plus, CheckCircle, XCircle, Loader2, Mail, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useBarbershop } from "@/context/BarbershopContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface Professional {
  id: string;
  name: string;
  email: string | null;
  user_id: string | null;
  active: boolean;
}

export default function Barbeiros() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { barbershop, isOwner } = useBarbershop();
  const { toast } = useToast();

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

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [creating, setCreating] = useState(false);

  // Carrega a lista de profissionais
  const fetchProfessionals = async () => {
    if (!barbershop) {
      setProfessionals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, email, user_id, active")
      .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar profissionais",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProfessionals(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfessionals();
  }, [barbershop]);

  // Handler do formulário de criação
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, email, password } = form;

    // Validações básicas
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, e‑mail e senha.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // 1️⃣ Cria o usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: name.trim(),
            role: "professional",
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não retornado após signUp");

      const userId = authData.user.id;

      // 2️⃣ Insere o profissional na tabela `professionals`
      const { data, error: insertError } = await supabase.from("professionals").insert({
        name: name.trim(),
        email: email.trim(),
        barbershop_id: barbershop.id, // CRITICAL: set barbershop_id
        user_id: userId,
        active: true,
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        toast({
          title: "Erro ao criar profissional",
          description: insertError.message ?? "Erro inesperado.",
          variant: "destructive",
        });
        throw insertError;
      }

      // 3️⃣ Tudo ok → mostra toast e limpa o formulário
      toast({ title: "Profissional criado com sucesso!", description: "O profissional já pode fazer login." });
      setForm({ name: "", email: "", password: "" });
      await fetchProfessionals(); // recarrega a lista      
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro ao criar profissional",
        description: err?.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Profissionais</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* FORMULÁRIO DE CRIAÇÃO */}
        <div className="glass rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Novo Profissional
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do profissional</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Carlos Silva"
                className="h-12 bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>E‑mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="profissional@exemplo.com"
                className="h-12 bg-secondary"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha (mín. 6 caracteres)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••"
                className="h-12 bg-secondary"
              />
            </div>
            <Button
              type="submit"
              variant="gold"
              className="w-full"
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                "Criar profissional"
              )}
            </Button>
          </form>
        </div>

        {/* Lista de profissionais */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {professionals.map((pro) => (
              <div key={pro.id} className="glass rounded-xl p-4 flex items-center justify-between cursor-pointer glass-hover animate-fade-in">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{pro.name}</h3>
                  {pro.email && (
                    <p className="text-sm text-muted-foreground truncate">{pro.email}</p>
                  )}
                  {pro.user_id && (
                    <p className="text-xs text-success truncate">✓ Usuário vinculado</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      pro.active
                        ? "bg-success/20 text-success border-success/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {pro.active
                      ? <><CheckCircle className="h-3 w-3" /> Ativo</>
                      : <><XCircle className="h-3 w-3" /> Inativo</>}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}