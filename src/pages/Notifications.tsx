import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useBarbershop } from "@/context/BarbershopContext";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns-tz";
import { supabase } from "@/integrations/supabase/client";

type Tab = "pendentes" | "enviadas" | "falhas";

export default function Notifications() {
  const { barbershop } = useBarbershop();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("pendentes");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!barbershop || !user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("scheduled_notifications").select(`
        id,
        send_at,
        status,
        error_message,
        created_at,
        appointments(client_name, barbershop_id)
      `).eq("status", tab === "pendentes" ? "pending" : tab === "enviadas" ? "sent" : "failed").order("send_at", { ascending: true });

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        setNotifications(data ?? []);
      }
      setLoading(false);
    };

    fetch();
  }, [tab, barbershop, user]);

  const formatZoned = (utc: string) => {
    const d = new Date(utc);
    return format(d, "PPP", { timeZone: "America/Sao_Paulo" });
  };

  const reSend = async (id: string) => {
    const { error } = await supabase.functions.invoke("send-push-reminder", {
      body: { appointment_id: id, action: "confirm" },
    });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Reenviado", variant: "success" });
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("scheduled_notifications").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else toast({ title: "Cancelado", variant: "success" });
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Notificações</h2>

      <div className="flex justify-between mb-4">
        <Button variant="outline" onClick={() => setTab("pendentes")} className={cn(tab === "pendentes" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          Pendentes
        </Button>
        <Button variant="outline" onClick={() => setTab("enviadas")} className={cn(tab === "enviadas" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          Enviadas
        </Button>
        <Button variant="outline" onClick={() => setTab("falhas")} className={cn(tab === "falhas" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
          Falhas
        </Button>
      </div>

      <Table
        columns={[
          { header: "Cliente", field: "client_name" },
          { header: "Agendamento", field: "send_at" },
          { header: "Enviado", field: "sent_at" },
          { header: "Status", field: "status" },
          { header: "Erro", field: "error_message" },
          { header: "Ações", field: "actions" },
        ]}
        data={notifications.map((n) => ({
          ...n,
          client_name: n.appointments?.client_name ?? "—",
          send_at: n.send_at ? formatZoned(n.send_at) : "—",
          sent_at: n.sent_at ? formatZoned(n.sent_at) : "—",
          status: n.status,
          error_message: n.error_message ?? "—",
          actions: (
            <div className="flex space-x-2">
              {n.status !== "cancelled" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => reSend(n.id)}
                  title="Reenviar"
                >
                  ⏮️
                </Button>
              )}
              {n.status === "pending" && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => cancel(n.id)}
                  title="Cancelar"
                >
                  ❌
                </Button>
              )}
            </div>
          )
        }))}
      />
    </div>
  );
}