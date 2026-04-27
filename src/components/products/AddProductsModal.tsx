import { useState, useEffect } from "react";
import { Package, Plus, Minus, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { cn } from "@/lib/utils";

interface SelectedProduct {
  productId: string;
  quantity: number;
}

interface ProductRow {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

interface AddProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selected: SelectedProduct[]) => void;
}

export function AddProductsModal({ open, onOpenChange, onConfirm }: AddProductsModalProps) {
  const { barbershop } = useBarbershop();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, number>>({});

  useEffect(() => {
    if (open && barbershop) {
      setLoading(true);
      supabase
        .from("products")
        .select("id, name, price, active")
        .eq("barbershop_id", barbershop.id)
        .eq("active", true)
        .order("name")
        .then(({ data }) => {
          setProducts((data || []).map(p => ({ ...p, price: Number(p.price) })));
          setLoading(false);
        });
    }
  }, [open, barbershop]);

  const updateQty = (productId: string, delta: number) => {
    setSelected((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  };

  const total = Object.entries(selected).reduce((sum, [id, qty]) => {
    const product = products.find((p) => p.id === id);
    return sum + (product?.price || 0) * qty;
  }, 0);

  const handleConfirm = () => {
    const items = Object.entries(selected).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));
    onConfirm(items);
    setSelected({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border max-w-sm mx-auto max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Adicionar Produtos
          </DialogTitle>
          <DialogDescription>Selecione os produtos consumidos durante o atendimento.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Esta barbearia ainda não possui produtos cadastrados.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {products.map((product) => {
              const qty = selected[product.id] || 0;
              return (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    qty > 0
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {product.price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {qty > 0 && (
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => updateQty(product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                    {qty > 0 && (
                      <span className="w-6 text-center font-semibold text-sm">{qty}</span>
                    )}
                    <Button
                      variant={qty > 0 ? "default" : "outline"}
                      size="icon-sm"
                      onClick={() => updateQty(product.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {Object.keys(selected).length > 0 && (
          <div className="pt-3 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total produtos:</span>
              <span className="text-lg font-bold text-primary">
                R$ {total.toFixed(2)}
              </span>
            </div>
            <Button variant="gold" size="lg" className="w-full" onClick={handleConfirm}>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Confirmar Produtos
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
