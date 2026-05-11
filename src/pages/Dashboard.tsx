import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendingUp, Calendar, Users, Scissors, DollarSign, CreditCard, Banknote, Smartphone } from "lucide-react";
import { Notifications } from "@/pages/Notifications";
import { useBarbershop } from "@/context/BarbershopContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { barbershop } = useBarbershop();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    todayRevenue: 0,
    pendingConfirmations: 0,
    topBarber: null,
    notifications: {
      pending: 0,
      sent: 0,
      failed: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barbershop) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch today's appointments count
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from("appointments")
          .select("id, status, total, services(name, price)")
          .eq("barbershop_id", barbershop.id)
          .eq("date", today)
          .not("status", "in", '("cancelado","faltou")');

        if (appointmentsError) throw appointmentsError;

        const todayAppointments = appointmentsData?.length || 0;
        const todayRevenue = appointmentsData?.reduce((sum, appt) => sum + (appt.total || 0), 0) || 0;
        const pendingConfirmations = appointmentsData?.filter(appt => appt.status === "agendado").length || 0;

        // Find top barber
        const barberCounts: Record<string, { count: number; revenue: number }> = {};
        appointmentsData?.forEach(appt => {
          // We'd need to join with professionals to get barber names
          // For now, we'll use a placeholder
        });

        // Fetch notification counts
        const { data: notificationsData, error: notificationsError } = await supabase
          .from("scheduled_notifications")
          .select("status")
          .eq("appointments.barbershop_id", barbershop.id);

        if (notificationsError) throw notificationsError;

        const notificationCounts = {
          pending: notificationsData?.filter(n => n.status === "pending").length || 0,
          sent: notificationsData?.filter(n => n.status === "sent").length || 0,
          failed: notificationsData?.filter(n => n.status === "failed").length || 0
        };

        setStats({
          todayAppointments,
          todayRevenue,
          pendingConfirmations,
          topBarber: { name: "Carregando...", count: 0 }, // Placeholder
          notifications: notificationCounts
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast({ title: "Erro", description: "Falha ao carregar estatísticas", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [barbershop, toast]);

  if (loading) {
    return (
      <PageLayout title="Dashboard">
        <div className="p-6">
          <div className="flex justify-center py-12">
            <div className="flex space-x-4">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-4 w-4 bg-primary animate-pulse" />
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-4 w-4 bg-primary animate-pulse" />
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-4 w-4 bg-primary animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Dashboard">
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Hoje"
            value={stats.todayAppointments}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Faturamento Hoje"
            value={`R$ ${stats.todayRevenue.toFixed(2)}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <StatCard
            title="Pendentes de Confirmação"
            value={stats.pendingConfirmations}
            icon={<Scissors className="h-5 w-5" />}
          />
          <StatCard
            title="Melhor Barbeiro"
            value={stats.topBarber?.name || "Carregando..."}
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Notification Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Notificações Pendentes"
            value={stats.notifications.pending}
            icon={<Smartphone className="h-5 w-5 text-primary" />}
          />
          <StatCard
            title="Notificações Enviadas"
            value={stats.notifications.sent}
            icon={<Smartphone className="h-5 w-5 text-success" />}
          />
          <StatCard
            title="Notificações Falhas"
            value={stats.notifications.failed}
            icon={<Smartphone className="h-5 w-5 text-destructive" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="gold" 
              size="lg" 
              className="w-full"
              onClick={() => {/* Navigate to new appointment */}}
            >
              Novo Agendamento
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={() => {/* Navigate to agenda */}}
            >
              Ver Agenda
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={() => {/* Navigate to clients */}}
            >
              Clientes
            </Button>
          </div>
        </div>

        {/* Notifications Preview */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Notificações</h2>
          <Notifications />
        </div>
      </div>
    </PageLayout>
  );
}

// Import Button component (needed for quick actions)
import { Button } from "@/components/ui/button";