import { useState, useEffect } from "react";
import { Calendar, DollarSign, Star, Clock, Plus, Scissors, Smartphone } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useBarbershop } from "@/context/BarbershopContext";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { barbershop } = useBarbershop();
  const { toast } = useToast();
  const [todayCount, setTodayCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [concludedCount, setConcludedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [pixPendingCount, setPixPendingCount] = useState(0);
  const [pixTodayTotal, setPixTodayTotal] = useState(0);

  useEffect(() => {
    if (!barbershop) return;
    const today = new Date().toISOString().split("T")[0];

    const fetchStats = async () => {
      const { data: appts } = await supabase
        .from("appointments")
        .select("id, status, total")
        .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
        .eq("date", today);

      if (appts) {
        setTodayCount(appts.length);
        setConcludedCount(appts.filter((a) => a.status === "atendido").length);
        setPendingCount(appts.filter((a) => a.status === "agendado" || a.status === "confirmado").length);
      }

      const { data: txns } = await supabase        .from("transactions")
        .select("amount")
        .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (txns) {
        setTodayRevenue(txns.reduce((s, t) => s + Number(t.amount), 0));
      }

      // Pix payments stats - using transactions table instead of payments
      const { data: pixTransactions } = await supabase
        .from("transactions")
        .select("amount, payment_method, created_at")
        .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      if (pixTransactions) {
        // Since transactions table doesn't have status field, assuming all transactions are confirmed        setPixPendingCount(0); // No pending state in transactions table
        
        // Calculate Pix today total: sum of Pix transactions from today
        const todayPix = pixTransactions.filter(
          (t) => t.payment_method === "pix" && t.created_at?.startsWith(today)
        );
        setPixTodayTotal(todayPix.reduce((s, p) => s + Number(p.amount), 0));
      }
    };
    fetchStats();
  }, [barbershop]);

  return (
    <PageLayout title="Dashboard">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/30">
            <AvatarImage src={barbershop?.logoUrl || undefined} alt="Logo" />
            <AvatarFallback className="bg-primary/10 text-primary">
              <Scissors className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold">{barbershop?.name || "Carregando..."}</h2>
            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard title="Agendamentos" value={todayCount} icon={<Calendar className="h-5 w-5" />} />
          <StatCard title="Faturamento" value={`R$ ${todayRevenue.toFixed(2)}`} icon={<DollarSign className="h-5 w-5" />} />
          <StatCard title="Concluídos" value={concludedCount} icon={<Star className="h-5 w-5" />} />
          <StatCard title="Aguardando" value={pendingCount} icon={<Clock className="h-5 w-5" />} />
          <StatCard title="Pix Hoje" value={`R$ ${pixTodayTotal.toFixed(2)}`} icon={<Smartphone className="h-5 w-5" />} />
          <StatCard title="Pix Pendentes" value={pixPendingCount} icon={<Smartphone className="h-5 w-5" />} />
        </div>

        <Link to="/agenda/novo">
          <Button variant="gold" size="lg" className="w-full">
            <Plus className="h-5 w-5 mr-2" />
            Novo Agendamento
          </Button>
        </Link>
      </div>
    </PageLayout>
  );
}