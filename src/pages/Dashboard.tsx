import { useState, useEffect } from "react";
import {
  Calendar,
  DollarSign,
  Star,
  Clock,
  Plus,
  Scissors,
  Smartphone,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
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
import { formatCurrency } from "@/lib/format";

export default function Dashboard() {
  const { barbershop } = useBarbershop();

  const { toast } = useToast();

  // =========================
  // STATES
  // =========================

  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] =
    useState(new Date());

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

  const [nextClient, setNextClient] =
    useState<any>(null);

  const [smartMessages, setSmartMessages] =
    useState<string[]>([]);

  // =========================
  // FORMAT DATE
  // =========================

  const selectedDateString =
    selectedDate
      .toISOString()
      .split("T")[0];

  const formattedDate =
    selectedDate.toLocaleDateString(
      "pt-BR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      }
    );

  // =========================
  // CHANGE DAY
  // =========================

  const changeDay = (days: number) => {
    const newDate = new Date(selectedDate);

    newDate.setDate(
      newDate.getDate() + days
    );

    setSelectedDate(newDate);
  };

  // =========================
  // EFFECT
  // =========================

  useEffect(() => {
    if (!barbershop) return;

    const fetchStats = async () => {
      try {
        setLoading(true);

        // =========================
        // HORA ATUAL
        // =========================

        const now = new Date();

        const currentTime =
          now.toLocaleTimeString(
            "pt-BR",
            {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            }
          );

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
              start_time,
              client_name
            `)
            .eq(
              "barbershop_id",
              barbershop.id
            )
            .eq(
              "date",
              selectedDateString
            );

        // =========================
        // PRÓXIMO CLIENTE
        // =========================

        let nextAppointmentsQuery =
          supabase
            .from("appointments")
            .select(`
              id,
              client_name,
              start_time,
              status
            `)
            .eq(
              "barbershop_id",
              barbershop.id
            )
            .eq(
              "date",
              selectedDateString
            )
            .in("status", [
              "agendado",
              "confirmado",
            ])
            .order("start_time", {
              ascending: true,
            });

        // Se for hoje, ignora horários passados
        const isToday =
          selectedDateString ===
          new Date()
            .toISOString()
            .split("T")[0];

        if (isToday) {
          nextAppointmentsQuery =
            nextAppointmentsQuery.gte(
              "start_time",
              currentTime
            );
        }

        const {
          data: nextAppointments,
        } =
          await nextAppointmentsQuery;

        if (
          nextAppointments &&
          nextAppointments.length > 0
        ) {
          const next =
            nextAppointments[0];

          setNextClient({
            name: next.client_name,
            time:
              next.start_time?.substring(
                0,
                5
              ),
          });
        } else {
          setNextClient(null);
        }

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

        // =========================
        // TRANSAÇÕES
        // =========================

        const {
          data: txns,
        } = await supabase
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
            `${selectedDateString}T00:00:00`
          )
          .lte(
            "created_at",
            `${selectedDateString}T23:59:59`
          );

        if (txns) {
          const revenue =
            txns.reduce(
              (s, t) =>
                s +
                Number(t.amount),
              0
            );

          setTodayRevenue(revenue);

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
                Number(p.amount),
              0
            )
          );

          setPixPendingCount(0);
        }

        // =========================
        // INSIGHTS
        // =========================

        const messages: string[] = [];

        const unconfirmed =
          appts?.filter(
            (a) =>
              a.status ===
              "agendado"
          ).length || 0;

        if (unconfirmed > 0) {
          messages.push(
            `⚠️ Você tem ${unconfirmed} cliente(s) sem confirmação neste dia.`
          );
        }

        const possibleRevenue =
          appts?.reduce(
            (sum, a) =>
              sum +
              Number(
                a.total || 0
              ),
            0
          ) || 0;

        if (possibleRevenue > 0) {
          messages.push(
            `💰 Sua agenda pode faturar ${formatCurrency(possibleRevenue)}.`
          );
        }

        const occupied =
          appts?.length || 0;

        const totalSlots = 12;

        const occupancy =
          Math.round(
            (occupied /
              totalSlots) *
              100
          ) || 0;

        if (occupancy >= 70) {
          messages.push(
            `🔥 Sua agenda está ${occupancy}% ocupada.`
          );
        }

        setSmartMessages(messages);
      } catch (error) {
        console.error(error);

        toast({
          title: "Erro",
          description:
            "Falha ao carregar dashboard",
          variant:
            "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [
    barbershop,
    selectedDateString,
  ]);

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================

  return (
    <PageLayout title="Dashboard">
      <div className="p-4 space-y-6">
        {/* HEADER */}

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

            <p className="text-muted-foreground text-sm capitalize">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* TROCA DE DIA */}

        <div className="flex items-center justify-between rounded-xl border p-3">
          <Button
            size="icon"
            variant="outline"
            onClick={() =>
              changeDay(-1)
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <p className="font-semibold capitalize">
              {formattedDate}
            </p>

            <p className="text-xs text-muted-foreground">
              Navegue pelos dias
            </p>
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={() =>
              changeDay(1)
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* SMART INSIGHTS */}

        {smartMessages.length > 0 && (
          <div className="space-y-3">
            {smartMessages.map(
              (msg, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                >
                  <p className="text-sm font-medium">
                    {msg}
                  </p>
                </div>
              )
            )}
          </div>
        )}

        {/* PRÓXIMO CLIENTE */}

        {nextClient && (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />

              <div>
                <p className="text-sm text-muted-foreground">
                  Próximo cliente
                </p>

                <p className="font-semibold">
                  {nextClient.name} às{" "}
                  {nextClient.time}
                </p>
              </div>
            </div>
          </div>
        )}

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
            value={formatCurrency(todayRevenue)}
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
            value={formatCurrency(pixTodayTotal)}
            icon={
              <Smartphone className="h-5 w-5" />
            }
          />

          <StatCard
            title="Pix Pendentes"
            value={pixPendingCount}
            icon={
              <AlertTriangle className="h-5 w-5" />
            }
          />
        </div>

        {/* BOTÃO */}

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