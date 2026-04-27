import { useState, useEffect } from "react";
import { 
  DollarSign, TrendingUp, CreditCard, Banknote, Smartphone,
  ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";

interface TransactionRow {
  id: string;
  amount: number;
  products_amount: number;
  payment_method: string;
  barber_commission: number;
  created_at: string;
  appointment_id: string | null;
  appointments: {
    client_name: string;
    services: { name: string } | null;
    professionals: { name: string } | null;
  } | null;
}

const paymentIcons: Record<string, typeof Smartphone> = {
  pix: Smartphone,
  dinheiro: Banknote,
  cartao_credito: CreditCard,
  cartao_debito: CreditCard,
};

const paymentLabels: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
};

export default function Caixa() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { barbershop } = useBarbershop();

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  useEffect(() => {
    if (!barbershop) return;
    const dateStr = currentDate.toISOString().split("T")[0];
    setLoading(true);

    supabase
      .from("transactions")
      .select("id, amount, products_amount, payment_method, barber_commission, created_at, appointment_id, appointments:appointments!transactions_appointment_id_fkey(client_name, services(name), professionals(name))")
      .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
      .gte("created_at", `${dateStr}T00:00:00`)
      .lte("created_at", `${dateStr}T23:59:59`)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTransactions((data as any) || []);
        setLoading(false);
      });
  }, [barbershop, currentDate]);

  const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalCommission = transactions.reduce((sum, t) => sum + t.barber_commission, 0);

  const pixTotal = transactions.filter((t) => t.payment_method === "pix").reduce((s, t) => s + t.amount, 0);
  const cardTotal = transactions.filter((t) => t.payment_method === "cartao_credito" || t.payment_method === "cartao_debito").reduce((s, t) => s + t.amount, 0);
  const cashTotal = transactions.filter((t) => t.payment_method === "dinheiro").reduce((s, t) => s + t.amount, 0);

  return (
    <PageLayout title="Caixa">
      <div className="p-4 space-y-4">
        {/* Date Navigation */}
        <div className="glass rounded-xl p-4 flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => navigateDay(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">
              {currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => navigateDay(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Faturamento" value={`R$ ${totalRevenue.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Comissões" value={`R$ ${totalCommission.toFixed(2)}`} icon={<TrendingUp className="h-5 w-5" />} />
        </div>

        {/* Payment Methods Summary */}
        <div className="glass rounded-xl p-4">
          <h3 className="font-semibold mb-3">Formas de Pagamento</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-secondary rounded-lg">
              <Smartphone className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">R$ {pixTotal.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pix</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <CreditCard className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">R$ {cardTotal.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Cartão</p>
            </div>
            <div className="text-center p-3 bg-secondary rounded-lg">
              <Banknote className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">R$ {cashTotal.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Dinheiro</p>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="space-y-3">
          <h3 className="font-semibold">Movimentações</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((transaction, index) => {
              const PaymentIcon = paymentIcons[transaction.payment_method] || Banknote;
              const apt = transaction.appointments as any;
              return (
                <div key={transaction.id} className="glass rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{apt?.client_name || "Cliente"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {apt?.services?.name || "Serviço"} • {apt?.professionals?.name || "Profissional"}
                      </p>
                      {transaction.products_amount > 0 && (
                        <p className="text-xs text-primary">+ Produtos: R$ {transaction.products_amount.toFixed(2)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">R$ {transaction.amount.toFixed(2)}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <PaymentIcon className="h-3 w-3" />
                        <span>{paymentLabels[transaction.payment_method] || transaction.payment_method}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="glass rounded-xl p-8 text-center">
              <p className="text-muted-foreground">Nenhuma movimentação registrada </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}