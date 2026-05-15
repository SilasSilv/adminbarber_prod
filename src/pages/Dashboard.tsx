import { useState, useEffect } from "react";

import {
  Calendar,
  DollarSign,
  Star,
  Clock,
  Plus,
  Scissors,
  Smartphone,
  TrendingUp,
  AlertTriangle,
  Trophy,
} from "lucide-react";

import { PageLayout } from "@/components/layout/PageLayout";

import { StatCard } from "@/components/dashboard/StatCard";

import { Button } from "@/components/ui/button";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { useBarbershop } from "@/context/BarbershopContext";

import { Link } from "react-router-dom";

import { useToast } from "@/hooks/use-toast";

import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {

  const { barbershop } =
    useBarbershop();

  const { toast } =
    useToast();

  const [todayCount, setTodayCount] =
    useState(0);

  const [todayRevenue, setTodayRevenue] =
    useState(0);

  const [concludedCount, setConcludedCount] =
    useState(0);

  const [pendingCount, setPendingCount] =
    useState(0);

  const [pixPendingCount, setPixPendingCount] =
    useState(0);

  const [pixTodayTotal, setPixTodayTotal] =
    useState(0);

  const [insights, setInsights] =
    useState<string[]>([]);

  // =========================
  // EFFECT
  // =========================

  useEffect(() => {

    if (!barbershop) return;

    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const fetchStats = async () => {

      try {

        // =========================
        // AGENDAMENTOS
        // =========================

        const { data: appts } =
          await supabase
            .from("appointments")
            .select(`
              id,
              status,
              total,
              professional_id,
              client_name,
              start_time
            `)
            .eq(
              "barbershop_id",
              barbershop.id
            )
            .eq("date", today);

        // =========================
        // TRANSAÇÕES
        // =========================

        const { data: txns } =
          await supabase
            .from("transactions")
            .select(`
              amount,
              payment_method,
              created_at
            `)
            .eq(
              "barbershop_id",
              barbershop.id
            )
            .gte(
              "created_at",
              `${today}T00:00:00`
            )
            .lte(
              "created_at",
              `${today}T23:59:59`
            );

        // =========================
        // PROFISSIONAIS
        // =========================

        const { data: professionals } =
          await supabase
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

        // =========================
        // ESTATÍSTICAS
        // =========================

        if (appts) {

          setTodayCount(appts.length);

          setConcludedCount(
            appts.filter(
              (a) =>
                a.status ===
                "atendido"
            ).length
          );

          setPendingCount(
            appts.filter(
              (a) =>
                a.status ===
                  "agendado" ||
                a.status ===
                  "confirmado"
            ).length
          );
        }

        if (txns) {

          setTodayRevenue(
            txns.reduce(
              (s, t) =>
                s +
                Number(
                  t.amount
                ),
              0
            )
          );

          const todayPix =
            txns.filter(
              (t) =>
                t.payment_method ===
                "pix"
            );

          setPixTodayTotal(
            todayPix.reduce(
              (s, p) =>
                s +
                Number(
                  p.amount
                ),
              0
            )
          );

          setPixPendingCount(0);
        }

        // =========================
        // INSIGHTS INTELIGENTES
        // =========================

        const generatedInsights:
          string[] = [];

        // Sem confirmação

        const unconfirmed =
          appts?.filter(
            (a) =>
              a.status ===
              "agendado"
          ).length || 0;

        if (unconfirmed > 0) {

          generatedInsights.push(
            `⚠️ Você tem ${unconfirmed} cliente(s) sem confirmação hoje`
          );
        }

        // Receita prevista

        const estimatedRevenue =
          appts?.reduce(
            (sum, a) =>
              sum +
              Number(
                a.total || 0
              ),
            0
          ) || 0;

        generatedInsights.push(
          `💰 Hoje sua agenda pode faturar R$ ${estimatedRevenue.toFixed(2)}`
        );

        // Ocupação

        const totalSlots = 20;

        const occupancy =
          Math.round(
            ((appts?.length || 0) /
              totalSlots) *
              100
          );

        generatedInsights.push(
          `🔥 Sua agenda está ${occupancy}% ocupada hoje`
        );

        // Horários restantes

        const remaining =
          totalSlots -
          (appts?.length || 0);

        if (remaining <= 3) {

          generatedInsights.push(
            `⏰ Restam apenas ${remaining} horário(s) disponíveis hoje`
          );
        }

        // Cancelamentos

        const canceled =
          appts?.filter(
            (a) =>
              a.status ===
              "cancelado"
          ).length || 0;

        if (canceled > 0) {

          generatedInsights.push(
            `📉 Você teve ${canceled} cancelamento(s) hoje`
          );
        }

        // Próximo atendimento

        const nextAppointment =
          appts
            ?.filter(
              (a) =>
                a.status !==
                "cancelado"
            )
            ?.sort((a, b) =>
              a.start_time.localeCompare(
                b.start_time
              )
            )[0];

        if (nextAppointment) {

          generatedInsights.push(
            `📅 Próximo cliente: ${nextAppointment.client_name} às ${nextAppointment.start_time?.substring(
              0,
              5
            )}`
          );
        }

        // Profissional destaque

        if (
          professionals &&
          appts
        ) {

          const revenueByProfessional:
            Record<
              string,
              number
            > = {};

          appts.forEach(
            (appt: any) => {

              if (
                !appt.professional_id
              ) return;

              revenueByProfessional[
                appt
                  .professional_id
              ] =
                (
                  revenueByProfessional[
                    appt
                      .professional_id
                  ] || 0
                ) +
                Number(
                  appt.total || 0
                );
            }
          );

          let bestProfessional =
            null;

          let bestRevenue = 0;

          professionals.forEach(
            (prof: any) => {

              const revenue =
                revenueByProfessional[
                  prof.id
                ] || 0;

              if (
                revenue >
                bestRevenue
              ) {

                bestRevenue =
                  revenue;

                bestProfessional =
                  prof.name;
              }
            }
          );

          if (
            bestProfessional
          ) {

            generatedInsights.push(
              `🏆 ${bestProfessional} lidera o faturamento hoje`
            );
          }
        }

        // Frases motivacionais

        if (
          occupancy >= 80
        ) {

          generatedInsights.push(
            "🚀 Agenda quase lotada hoje!"
          );
        }

        if (
          occupancy === 100
        ) {

          generatedInsights.push(
            "🎉 Agenda totalmente lotada hoje!"
          );
        }

        setInsights(
          generatedInsights
        );

      } catch (err) {

        console.error(err);

        toast({
          title: "Erro",
          description:
            "Falha ao carregar dashboard",
          variant:
            "destructive",
        });
      }
    };

    fetchStats();

  }, [barbershop]);

  // =========================
  // RENDER
  // =========================

  return (
    <PageLayout title="Dashboard">

      <div className="p-4 space-y-6">

        {/* TOPO */}

        <div className="flex items-center gap-3">

          <Avatar className="h-12 w-12 border-2 border-primary/30">

            <AvatarImage
              src={
                barbershop?.logoUrl ||
                undefined
              }
              alt="Logo"
            />

            <AvatarFallback className="bg-primary/10 text-primary">
              <Scissors className="h-5 w-5" />
            </AvatarFallback>

          </Avatar>

          <div className="space-y-0.5">

            <h2 className="text-2xl font-bold">
              {barbershop?.name ||
                "Carregando..."}
            </h2>

            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString(
                "pt-BR",
                {
                  weekday:
                    "long",
                  day: "numeric",
                  month:
                    "long",
                }
              )}
            </p>

          </div>
        </div>

        {/* INSIGHTS */}

        <div className="space-y-2">

          {insights.map(
            (
              insight,
              index
            ) => (

              <div
                key={index}
                className="
                  glass
                  rounded-xl
                  p-3
                  border
                  border-primary/20
                  text-sm
                  animate-fade-in
                "
              >
                {insight}
              </div>
            )
          )}

        </div>

        {/* CARDS */}

        <div className="grid grid-cols-2 gap-3">

          <StatCard
            title="Agendamentos"
            value={todayCount}
            icon={
              <Calendar className="h-5 w-5" />
            }
          />

          <StatCard
            title="Faturamento"
            value={`R$ ${todayRevenue.toFixed(
              2
            )}`}
            icon={
              <DollarSign className="h-5 w-5" />
            }
          />

          <StatCard
            title="Concluídos"
            value={concludedCount}
            icon={
              <Star className="h-5 w-5" />
            }
          />

          <StatCard
            title="Aguardando"
            value={pendingCount}
            icon={
              <Clock className="h-5 w-5" />
            }
          />

          <StatCard
            title="Pix Hoje"
            value={`R$ ${pixTodayTotal.toFixed(
              2
            )}`}
            icon={
              <Smartphone className="h-5 w-5" />
            }
          />

          <StatCard
            title="Pix Pendentes"
            value={pixPendingCount}
            icon={
              <Smartphone className="h-5 w-5" />
            }
          />

        </div>

        {/* NOVO AGENDAMENTO */}

        <Link to="/agenda/novo">

          <Button
            variant="gold"
            size="lg"
            className="w-full"
          >

            <Plus className="h-5 w-5 mr-2" />

            Novo Agendamento

          </Button>

        </Link>

      </div>
    </PageLayout>
  );
}