import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus, Pencil, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  active: boolean;
  description: string | null;
}

export default function Products() {
  const { barbershop } = useBarbershop();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    if (!barbershop) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
      .order("name");
    setProducts(
      (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        stock: p.stock,
        active: p.active,
        description: p.description,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [barbershop]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setStock("");
    setDescription("");
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setName(product.name);
    setPrice(product.price.toString());
    setStock(product.stock?.toString() || "");
    setDescription(product.description || "");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!barbershop || !name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      price: parseFloat(price) || 0,
      stock: stock ? parseInt(stock) : null,
      description: description.trim() || null,
      barbershop_id: barbershop.id, // CRITICAL: set barbershop_id
    };

    if (editing) {
      await supabase.from("products").update(payload).eq("id", editing.id);
      toast({ title: "Produto atualizado ✅" });
    } else {
      await supabase.from("products").insert(payload);
      toast({ title: "Produto criado ✅" });
    }
    setSaving(false);
    setModalOpen(false);
    fetchProducts();
  };

  const toggleActive = async (product: Product) => {
    await supabase.from("products").update({ active: !product.active }).eq("id", product.id);
    fetchProducts();
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageLayout title="Produtos">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-11 bg-secondary"
            />
          </div>
          <Button variant="gold" onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Novo
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="glass rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {product.price.toFixed(2)}
                      {product.stock !== null && ` • Estoque: ${product.stock}`}
                    </p>                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={product.active}
                    onCheckedChange={() => toggleActive(product)}
                  />
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(product)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize as informações do produto." : "Preencha os dados do novo produto."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pomada modeladora" className="h-12 bg-secondary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Preço (R$)</Label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" className="h-12 bg-secondary" />
              </div>
              <div className="space-y-2">
                <Label>Estoque</Label>
                <Input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Opcional" className="h-12 bg-secondary" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="h-12 bg-secondary" />
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : editing ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}