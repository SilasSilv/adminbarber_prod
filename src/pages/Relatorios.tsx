import { useState, useEffect } from "react";
import { ArrowLeft, Calendar, TrendingUp, Scissors, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageLayout } from "@/components/layout/PageLayout";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { cn } from "@/lib/utils";

export default function Relatorios() {
  const navigate = useNavigate();
  const { barbershop } = useBarbershop();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!barbershop) {
      setError("Barbershop not found");
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // 1️⃣ Get today's appointments and calculate revenue
        const { data: appts, error: apptError } = await supabase
          .from("appointments")
          .select("id, status, total, service_id, barber_id")
          .eq("barbershop_id", barbershop.id)
          .eq("date", today);

        if (apptError) throw apptError;

        // 2️⃣ Get transactions for today (includes payment info)
        const { data: txns, error: txnError } = await supabase
          .from("transactions")
          .select("amount, payment_method, barber_commission")
          .eq("barbershop_id", barbershop.id)
          .gte("created_at", `${today}T00:00:00`)
          .lte("created_at", `${today}T23:59:59`);

        if (txnError) throw txnError;

        // 3️⃣ Get services for top service calculation
        const { data: services, error: svcError } = await supabase
          .from("services")
          .select("id, name, price")
          .eq("barbershop_id", barbershop.id)
          .eq("active", true);

        if (svcError) throw svcError;

        // 4️⃣ Get professionals for barber performance
        const { data: pros, error: proError } = await supabase
          .from("professionals")
          .select("id, name, commission_percent")
          .eq("barbershop_id", barbershop.id)
          .eq("active", true);

        if (proError) throw proError;

        // 5️⃣ Calculate derived statistics
        const todayAppointments = appts?.length || 0;
        const todayRevenue = txns?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const concludedCount = appts?.filter((a) => a.status === "atendido").length || 0;
        const pendingCount = appts?.filter((a) => 
          a.status === "agendado" || a.status === "confirmado"
        ).length || 0;

        // Calculate revenue by professional
        const professionalRevenue: Record<string, number> = {};
        appts?.forEach((appt: any) => {
          const profId = appt.barber_id;
          if (profId) {
            const commission = appt.total * (appt.commission_percent || 50) / 100;
            professionalRevenue[profId] = (professionalRevenue[profId] || 0) + commission;
          }
        });

        // Build barber performance array
        const barberStats = pros?.map((prof: any) => ({
          name: prof.name,
          appointments: appts?.filter((a) => a.barber_id === prof.id).length || 0,
          revenue: professionalRevenue[prof.id] || 0,
          commission: prof.commission_percent || 0,
        })) || [];

        // Find top selling service
        const serviceStats = services?.map((service: any) => {
          const count = appts?.filter((a) => a.service_id === service.id).length || 0;
          return { service, count, revenue: count * service.price };
        }).sort((a, b) => b.count - a.count) || [];

        // Prepare data for StatCards        setStats([
          {
            title: "Faturamento",
            value: `R$ ${todayRevenue.toFixed(2)}`,
            icon: <TrendingUp className="h-5 w-5" />,
            trend: { value: todayRevenue, positive: true }
          },
          {
            title: "Atendimentos",
            value: todayAppointments.toString(),
            icon: <Calendar className="h-5 w-5" />,
            trend: { value: todayAppointments, positive: true }
          },
          {
            title: "Profissionais",
            value: barberStats.length.toString(),
            icon: <Users className="h-5 w-5" />,
            trend: { value: barberStats.length, positive: true }
          },
          ...(serviceStats.length > 0 ? [{
            title: "Serviço Mais Vendido",
            value: serviceStats[0].service,
            icon: <Scissors className="h-5 w-5" />,
            trend: { value: serviceStats[0].count, positive: true }
          } : [])
        ]);

        setError(null);
      } catch (err: any) {
        console.error("Error fetching stats:", err);
        setError(err.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [barbershop]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold">Erro ao carregar relatórios</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => navigate("/dashboard")}>Voltar</Button>
      </div>
    );
  }

  return (
    <PageLayout title="Relatórios">
      <div className="p-4 space-y-6">
        {/* Period selector */}
        <div className="flex gap-2">
          <Button variant="default" size="sm">Mês Atual</Button>
          <Button variant="outline" size="sm">Semana</Button>
          <Button variant="outline" size="sm">Período</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              trend={stat.trend}
              className="animate-fade-in"
            />
          ))}
        </div>

        {/* Barber Performance */}
        {stats.some((s) => s.title === "Profissionais") && (
          <div className="space-y-3 mt-6">
            <h3 className="font-semibold text-lg">Desempenho por Barbeiro</h3>
            {stats              .filter((s) => s.title === "Profissionais")
              .map((barber, index) => (
                <div                  key={index}
                  className="glass rounded-xl p-4 animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {barber.name.charAt(0)}
                        </span>
                      </div>
                      <span className="font-semibold text-sm">{barber.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {barber.appointments} atendimentos
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Faturamento</p>
                      <p className="font-semibold text-lg text-primary">
                        R$ {barber.revenue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Comissão</p>
                      <p className="font-semibold text-lg text-primary">
                        R$ {barber.commission.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Service */}
          {stats.some((s) => s.title === "Serviço Mais Vendido") && (
            <div className="space-y-3 mt-6">
              <h3 className="font-semibold text-lg">Serviço Mais Vendido</h3>
              {stats.find((s) => s.title === "Serviço Mais Vendido")?.value && (
                <div className="text-center">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Scissors className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-sm text-muted-foreground">
                    {stats.find((s) => s.title === "Serviço Mais Vendido")?.value}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}