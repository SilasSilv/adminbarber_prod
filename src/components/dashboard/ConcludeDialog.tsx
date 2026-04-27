import { useState } from "react";
import { CheckCircle, Smartphone, Banknote, CreditCard, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PaymentMethod } from "@/types/barbershop";
import { AddProductsModal } from "@/components/products/AddProductsModal";
import { useAppointments } from "@/context/AppointmentContext";
import { cn } from "@/lib/utils";

const paymentOptions: { value: PaymentMethod; label: string; icon: typeof Smartphone }[] = [
  { value: "pix", label: "Pix", icon: Smartphone },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cartao_credito", label: "Crédito", icon: CreditCard },
  { value: "cartao_debito", label: "Débito", icon: CreditCard },
];

interface SelectedProduct {
  productId: string;
  quantity: number;
}

interface ConcludeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  servicePrice: number;
  onConfirm: (method: PaymentMethod, products?: SelectedProduct[]) => void;
}

export function ConcludeDialog({ open, onOpenChange, serviceName, servicePrice, onConfirm }: ConcludeDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productsModalOpen, setProductsModalOpen] = useState(false);

  const { products } = useAppointments();

  const productsTotal = selectedProducts.reduce((sum, sp) => {
    const product = products.find((p) => p.id === sp.productId);
    return sum + (product?.price || 0) * sp.quantity;
  }, 0);

  const grandTotal = servicePrice + productsTotal;

  const handleConfirm = () => {
    if (selectedMethod) {
      onConfirm(selectedMethod, selectedProducts.length > 0 ? selectedProducts : undefined);
      setSelectedMethod(null);
      setSelectedProducts([]);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass border-border max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Concluir Atendimento
            </DialogTitle>
            <DialogDescription>
              {serviceName} — <span className="text-primary font-semibold">R$ {servicePrice.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Products section */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setProductsModalOpen(true)}
              >
                <ShoppingCart className="h-4 w-4 text-primary" />
                {selectedProducts.length > 0
                  ? `${selectedProducts.length} produto(s) — R$ ${productsTotal.toFixed(2)}`
                  : "Adicionar Produtos"}
              </Button>
              {selectedProducts.length > 0 && (
                <div className="text-sm space-y-1 px-2">
                  {selectedProducts.map((sp) => {
                    const product = products.find((p) => p.id === sp.productId);
                    return (
                      <div key={sp.productId} className="flex justify-between text-muted-foreground">
                        <span>{sp.quantity}x {product?.name}</span>
                        <span>R$ {((product?.price || 0) * sp.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grand total */}
            {productsTotal > 0 && (
              <div className="flex justify-between items-center p-3 rounded-xl bg-primary/10 border border-primary/30">
                <span className="font-medium text-sm">Total geral:</span>
                <span className="text-lg font-bold text-primary">R$ {grandTotal.toFixed(2)}</span>
              </div>
            )}

            <p className="text-sm text-muted-foreground">Forma de pagamento:</p>
            <div className="grid grid-cols-2 gap-2">
              {paymentOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedMethod(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    selectedMethod === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary hover:border-primary/50"
                  )}
                >
                  <option.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>

            <Button
              variant="gold"
              size="lg"
              className="w-full"
              disabled={!selectedMethod}
              onClick={handleConfirm}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirmar Recebimento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddProductsModal
        open={productsModalOpen}
        onOpenChange={setProductsModalOpen}
        onConfirm={setSelectedProducts}
      />
    </>
  );
}
