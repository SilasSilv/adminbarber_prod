import { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  Scissors,
  Users,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { PageLayout } from "@/components/layout/PageLayout";

import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";

export default function Relatorios() {
  const navigate = useNavigate();

  const { barbershop } = useBarbershop();

  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any[]>([]);

  const [barberStats, setBarberStats] = useState<any[]>([]);

  const [topService, setTopService] = useState<any>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [period, setPeriod] =
    useState<"month" | "week" | "today">(
      "month"
    );

  // =========================
  // DATA ATUAL
  // =========================

  const today =
    new Date()
      .toISOString()
      .split("T")[0];

  // =========================
  // EFFECT
  // =========================

  useEffect(() => {
    if (!barbershop) {
      setError("Barbearia não encontrada");

      setLoading(false);

      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);

        // =========================
        // FILTRO DE DATA
        // =========================

        let startDate = today;
        let endDate = today;

        const now = new Date();

        // SEMANA
        if (period === "week") {
          const firstDay = new Date(now);

          firstDay.setDate(
            now.getDate() - 7
          );

          startDate =
            firstDay
              .toISOString()
              .split("T")[0];

          endDate = today;
        }

        // MÊS
        if (period === "month") {
          const firstDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          );

          startDate =
            firstDay
              .toISOString()
              .split("T")[0];

          endDate = today;
        }

        // HOJE
        if (period === "today") {
          startDate = today;
          endDate = today;
        }

        // =========================
        // AGENDAMENTOS
        // =========================

        const {
          data: appts,
          error: apptError,
        } = await supabase
          .from("appointments")
          .select(`
            id,
            status,
            total,
            service_id,
            professional_id,
            date
          `)
          .eq(
            "barbershop_id",
            barbershop.id
          )
          .gte("date", startDate)
          .lte("date", endDate);

        if (apptError) {
          throw apptError;
        }

        // =========================
        // TRANSAÇÕES
        // =========================

        const {
          data: txns,
          error: txnError,
        } = await supabase
          .from("transactions")
          .select(`
            amount,
            payment_method,
            barber_commission,
            created_at
          `)
          .eq(
            "barbershop_id",
            barbershop.id
          )
          .gte(
            "created_at",
            `${startDate}T00:00:00`
          )
          .lte(
            "created_at",
            `${endDate}T23:59:59`
          );

        if (txnError) {
          throw txnError;
        }

        // =========================
        // SERVIÇOS
        // =========================

        const {
          data: services,
          error: svcError,
        } = await supabase
          .from("services")
          .select(`
            id,
            name,
            price
          `)
          .eq(
            "barbershop_id",
            barbershop.id
          )
          .eq("active", true);

        if (svcError) {
          throw svcError;
        }

        // =========================
        // PROFISSIONAIS
        // =========================

        const {
          data: pros,
          error: proError,
        } = await supabase
          .from("professionals")
          .select(`
            id,
            name
          `)
          .eq(
            "barbershop_id",
            barbershop.id
          )
          .eq("active", true);

        if (proError) {
          throw proError;
        }

        // =========================
        // ESTATÍSTICAS GERAIS
        // =========================

        const todayAppointments =
          appts?.length || 0;

        const todayRevenue =
          txns?.reduce(
            (sum, t) =>
              sum + Number(t.amount),
            0
          ) || 0;

        // =========================
        // FATURAMENTO POR PROFISSIONAL
        // =========================

        const professionalRevenue:
          Record<string, number> = {};

        appts?.forEach((appt: any) => {
          const profId =
            appt.professional_id;

          if (!profId) return;

          const total =
            Number(appt.total || 0);

          professionalRevenue[
            profId
          ] =
            (professionalRevenue[
              profId
            ] || 0) + total;
        });

        // =========================
        // PERFORMANCE
        // =========================

        const barberPerformance =
          pros?.map((prof: any) => {
            const revenue =
              professionalRevenue[
                prof.id
              ] || 0;

            const appointmentsCount =
              appts?.filter(
                (a) =>
                  a.professional_id ===
                  prof.id
              ).length || 0;

            return {
              id: prof.id,

              name: prof.name,

              appointments:
                appointmentsCount,

              revenue,

              commission:
                revenue * 0.5,
            };
          }) || [];

        setBarberStats(
          barberPerformance
        );

        // =========================
        // SERVIÇO MAIS VENDIDO
        // =========================

        const serviceStats =
          services?.map(
            (service: any) => {
              const count =
                appts?.filter(
                  (a) =>
                    a.service_id ===
                    service.id
                ).length || 0;

              return {
                service: service.name,

                count,

                revenue:
                  count *
                  Number(
                    service.price
                  ),
              };
            }
          )
            .sort(
              (a, b) =>
                b.count - a.count
            ) || [];

        if (
          serviceStats.length > 0
        ) {
          setTopService(
            serviceStats[0]
          );
        } else {
          setTopService(null);
        }

        // =========================
        // CARDS
        // =========================

        setStats([
          {
            title: "Faturamento",

            value:
              `R$ ${todayRevenue.toFixed(2)}`,

            icon:
              <TrendingUp className="h-5 w-5" />,

            trend: {
              value: todayRevenue,
              positive: true,
            },
          },

          {
            title: "Atendimentos",

            value:
              todayAppointments.toString(),

            icon:
              <Calendar className="h-5 w-5" />,

            trend: {
              value:
                todayAppointments,
              positive: true,
            },
          },

          {
            title: "Profissionais",

            value:
              barberPerformance.length.toString(),

            icon:
              <Users className="h-5 w-5" />,

            trend: {
              value:
                barberPerformance.length,
              positive: true,
            },
          },

          {
            title:
              "Serviço Mais Vendido",

            value:
              serviceStats[0]
                ?.service || "-",

            icon:
              <Scissors className="h-5 w-5" />,

            trend: {
              value:
                serviceStats[0]
                  ?.count || 0,

              positive: true,
            },
          },
        ]);

        setError(null);
      } catch (err: any) {
        console.error(
          "Erro ao buscar estatísticas:",
          err
        );

        setError(
          err.message ||
            "Erro ao carregar relatórios"
        );

        toast({
          title: "Erro",
          description:
            "Falha ao carregar relatórios",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [barbershop, period]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // =========================
  // ERROR
  // =========================

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">
            Erro ao carregar relatórios
          </h1>

          <p className="text-muted-foreground">
            {error}
          </p>

          <Button
            onClick={() =>
              navigate("/dashboard")
            }
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================

  return (
    <PageLayout title="Relatórios">
      <div className="p-4 space-y-6">

        {/* FILTROS */}

        <div className="flex gap-2">

          <Button
            variant={
              period === "month"
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() =>
              setPeriod("month")
            }
          >
            Mês Atual
          </Button>

          <Button
            variant={
              period === "week"
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() =>
              setPeriod("week")
            }
          >
            Semana
          </Button>

          <Button
            variant={
              period === "today"
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() =>
              setPeriod("today")
            }
          >
            Hoje
          </Button>

        </div>

        {/* CARDS */}

        <div className="grid grid-cols-2 gap-3">
          {stats.map(
            (stat, index) => (
              <StatCard
                key={index}
                title={stat.title}
                value={stat.value}
                icon={stat.icon}
                trend={stat.trend}
                className="animate-fade-in"
              />
            )
          )}
        </div>

        {/* PROFISSIONAIS */}

        <div className="space-y-3 mt-6">
          <h3 className="font-semibold text-lg">
            Desempenho por Profissional
          </h3>

          {barberStats.map(
            (barber, index) => (
              <div
                key={index}
                className="glass rounded-xl p-4 animate-slide-up"
              >
                <div className="flex items-center justify-between mb-3">

                  <div className="flex items-center gap-3">

                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold">
                        {barber.name?.charAt(0)}
                      </span>
                    </div>

                    <span className="font-semibold text-sm">
                      {barber.name}
                    </span>

                  </div>

                  <span className="text-sm text-muted-foreground">
                    {barber.appointments} atendimentos
                  </span>

                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">

                  <div>
                    <p className="text-muted-foreground">
                      Faturamento
                    </p>

                    <p className="font-semibold text-lg text-primary">
                      R$ {barber.revenue.toFixed(2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">
                      Comissão
                    </p>

                    <p className="font-semibold text-lg text-primary">
                      R$ {barber.commission.toFixed(2)}
                    </p>
                  </div>

                </div>
              </div>
            )
          )}
        </div>

        {/* SERVIÇO MAIS VENDIDO */}

        {topService && (
          <div className="space-y-3 mt-6">

            <h3 className="font-semibold text-lg">
              Serviço Mais Vendido
            </h3>

            <div className="glass rounded-xl p-4">

              <div className="flex items-center gap-3">

                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-primary" />
                </div>

                <div>
                  <p className="font-semibold">
                    {topService.service}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {topService.count} vendas
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
}