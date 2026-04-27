import { useState, useEffect, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight, Loader2, CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { AgendaGrid } from "@/components/agenda/AgendaGrid";
import { WeeklyAgendaGrid } from "@/components/agenda/WeeklyAgendaGrid";
import { AgendaAppointment } from "@/components/agenda/AgendaTimelineCard";
import { EditAppointmentModal, EditableService, EditableProfessional } from "@/components/agenda/EditAppointmentModal";
import { CreateAppointmentModal } from "@/components/agenda/CreateAppointmentModal";
import { ConcludeDialog } from "@/components/dashboard/ConcludeDialog";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaymentMethod } from "@/types/barbershop";

type ViewMode = "daily" | "weekly" | "monthly";
const weekDayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getWeekDates(baseDate: Date) {
  const dates: Date[] = [];
  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }
  return dates;
}

function formatDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
  const [professionals, setProfessionals] = useState<EditableProfessional[]>([]);
  const [servicesData, setServicesData] = useState<EditableService[]>([]);
  const [productsData, setProductsData] = useState<{ id: string; name: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<AgendaAppointment | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createDefaultTime, setCreateDefaultTime] = useState("09:00");
  const [createDefaultDate, setCreateDefaultDate] = useState("");
  const [concludeDialogOpen, setConcludeDialogOpen] = useState(false);
  const [concludingAppointment, setConcludingAppointment] = useState<AgendaAppointment | null>(null);
  const { barbershop } = useBarbershop();
  const { toast } = useToast();

  const weekDates = getWeekDates(currentDate);
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isSelected = (date: Date) => date.toDateString() === selectedDate.toDateString();
  const dateStr = formatDateStr(selectedDate);

  // Fetch professionals, services & products - ALL filtered by barbershop_id
  useEffect(() => {
    if (!barbershop) return;
    
    const fetchData = async () => {
      setLoading(true);
      
      const [profRes, svcRes, prodRes] = await Promise.all([
        supabase.from("professionals").select("id, name").eq("barbershop_id", barbershop.id).eq("active", true),
        supabase.from("services").select("id, name, duration_minutes, price").eq("barbershop_id", barbershop.id).eq("active", true),
        supabase.from("products").select("id, name, price").eq("barbershop_id", barbershop.id).eq("active", true),
      ]);
      
      setProfessionals(profRes.data || []);
      setServicesData(svcRes.data || []);
      setProductsData(prodRes.data || []);
      setLoading(false);
    };
    
    fetchData();
  }, [barbershop]);

  const fetchAppointments = async () => {
    if (!barbershop) return;
    setLoading(true);

    let startDate: string;
    let endDate: string;

    if (viewMode === "weekly") {
      startDate = formatDateStr(weekDates[0]);
      endDate = formatDateStr(weekDates[6]);
    } else if (viewMode === "monthly") {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      startDate = formatDateStr(new Date(year, month, 1));
      endDate = formatDateStr(new Date(year, month + 1, 0));
    } else {
      startDate = dateStr;
      endDate = dateStr;
    }

    let query = supabase
      .from("appointments")
      .select("id, client_name, client_phone, start_time, end_time, date, status, total, is_encaixe, service_id, professional_id, services(name), professionals(name)")
      .eq("barbershop_id", barbershop.id) // CRITICAL: filter by barbershop_id
      .gte("date", startDate)
      .lte("date", endDate)
      .order("start_time");
      
    if (selectedProfessional) {
      query = query.eq("professional_id", selectedProfessional);
    }
    
    const { data, error } = await query;
    
    if (error) { 
      console.error(error); 
      setLoading(false); 
      return; 
    }
    
    const mapped: AgendaAppointment[] = (data || []).map((row: any) => ({
      id: row.id,
      client_name: row.client_name,
      client_phone: row.client_phone,
      service_name: row.services?.name || "Serviço",
      professional_name: row.professionals?.name || "Profissional",
      start_time: row.start_time?.substring(0, 5) || "00:00",
      end_time: row.end_time?.substring(0, 5) || "00:30",
      date: row.date,
      status: row.status,
      total: row.total,
      is_encaixe: row.is_encaixe || false,
      service_id: row.service_id,
      professional_id: row.professional_id,
    }));
    setAppointments(mapped);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [barbershop, selectedDate, currentDate, viewMode, selectedProfessional]);

  // Group appointments by date for weekly view
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, AgendaAppointment[]> = {};
    for (const apt of appointments) {
      if (!map[apt.date]) map[apt.date] = [];
      map[apt.date].push(apt);
    }
    return map;
  }, [appointments]);

  const dailyAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === dateStr);
  }, [appointments, dateStr]);

  const handleWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(`Olá ${name}! Confirmando seu agendamento na barbearia.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleConcludeClick = (id: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (apt) { setConcludingAppointment(apt); setConcludeDialogOpen(true); }
  };

  const handleConcludeConfirm = async (method: PaymentMethod, products?: { productId: string; quantity: number }[]) => {
    if (!concludingAppointment || !barbershop) return;
    const id = concludingAppointment.id;
    const { error } = await supabase.from("appointments").update({ status: "atendido" }).eq("id", id);
    if (error) return;
    let productsAmount = 0;
    const productRows: { appointment_id: string; product_id: string; quantity: number; unit_price: number; total: number }[] = [];
    if (products && products.length > 0) {
      for (const sp of products) {
        const prod = productsData.find((p) => p.id === sp.productId);
        const unitPrice = prod?.price || 0;
        const lineTotal = unitPrice * sp.quantity;
        productsAmount += lineTotal;
        productRows.push({ appointment_id: id, product_id: sp.productId, quantity: sp.quantity, unit_price: unitPrice, total: lineTotal });
      }
    }
    const totalAmount = concludingAppointment.total + productsAmount;
    await supabase.from("transactions").insert({ appointment_id: id, barbershop_id: barbershop.id, amount: totalAmount, products_amount: productsAmount, payment_method: method, barber_commission: 0 });
    if (productRows.length > 0) await supabase.from("appointment_products").insert(productRows);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "atendido" } : a)));
    setConcludingAppointment(null);
    const paymentLabel = method === "pix" ? "Pix" : method === "dinheiro" ? "Dinheiro" : method === "cartao_credito" ? "Crédito" : "Débito";
    toast({ title: "Atendimento concluído! ✅", description: `R$ ${totalAmount.toFixed(2)} via ${paymentLabel}.${productsAmount > 0 ? ` (Produtos: R$ ${productsAmount.toFixed(2)})` : ""}` });
  };

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast({ title: "Status atualizado ✅" });
    }
  };

  const handleEditClick = (apt: AgendaAppointment) => { setEditingAppointment(apt); setEditModalOpen(true); };

  const handleEditSave = async (updated: AgendaAppointment) => {
    const { error } = await supabase.from("appointments").update({
      client_name: updated.client_name,
      client_phone: updated.client_phone,
      service_id: updated.service_id,
      professional_id: updated.professional_id,
      start_time: updated.start_time,
      end_time: updated.end_time,
      status: updated.status,
      total: updated.total,
    }).eq("id", updated.id);
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast({ title: "Agendamento atualizado ✅" });
    }
  };

  const handleEditDelete = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (!error) {
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Agendamento removido 🗑️" });
    }
  };

  const handleSlotClick = (time: string) => {
    setCreateDefaultTime(time);
    setCreateDefaultDate(dateStr);
    setCreateModalOpen(true);
  };

  const handleWeeklySlotClick = (date: Date, time: string) => {
    setSelectedDate(date);
    setCreateDefaultTime(time);
    setCreateDefaultDate(formatDateStr(date));
    setCreateModalOpen(true);
  };

  const handleCreateSave = async (data: {
    client_name: string;
    client_phone: string;
    service_id: string;
    professional_id: string;
    start_time: string;
    end_time: string;
    is_encaixe: boolean;
  }) => {
    if (!barbershop) return;
    const svc = servicesData.find((s) => s.id === data.service_id);
    const targetDate = createDefaultDate || dateStr;
    const { error } = await supabase.from("appointments").insert({
      barbershop_id: barbershop.id, // CRITICAL: always set barbershop_id
      client_name: data.client_name,
      client_phone: data.client_phone,
      service_id: data.service_id,
      professional_id: data.professional_id,
      start_time: data.start_time,
      end_time: data.end_time,
      date: targetDate,
      is_encaixe: data.is_encaixe,
      total: svc?.price || 0,
      status: "agendado",
    });
    if (!error) {
      toast({ title: "Agendamento criado ✅" });
      fetchAppointments();
    } else {
      toast({ title: "Erro ao criar agendamento", description: error.message, variant: "destructive" });
    }
  };

  const handleDragEnd = async (id: string, newStartTime: string, newEndTime: string) => {
    const { error } = await supabase.from("appointments").update({ start_time: newStartTime, end_time: newEndTime }).eq("id", id);
    if (!error) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, start_time: newStartTime, end_time: newEndTime } : a)));
      toast({ title: "Horário atualizado ✅" });
    }
  };

  const navigate = (direction: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === "daily") d.setDate(d.getDate() + direction);
    else if (viewMode === "weekly") d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setCurrentDate(d);
    if (viewMode === "daily") setSelectedDate(d);
  };

  const headerLabel = viewMode === "daily"
    ? currentDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    : currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <PageLayout title="Agenda">
      <div className="p-4 space-y-3">
        {/* View Mode Toggle + New Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            <button onClick={() => setViewMode("daily")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all", viewMode === "daily" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <CalendarDays className="h-4 w-4" /> Dia
            </button>
            <button onClick={() => setViewMode("weekly")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all", viewMode === "weekly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <CalendarRange className="h-4 w-4" /> Semana
            </button>
            <button onClick={() => setViewMode("monthly")} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all", viewMode === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Calendar className="h-4 w-4" /> Mês
            </button>
          </div>
          <Button variant="gold" size="sm" onClick={() => { setCreateDefaultTime("09:00"); setCreateDefaultDate(dateStr); setCreateModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-center flex-1 text-sm capitalize">{headerLabel}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Professional Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Button variant={selectedProfessional === null ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setSelectedProfessional(null)}>Todos</Button>
          {professionals.map((p) => (
            <Button key={p.id} variant={selectedProfessional === p.id ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setSelectedProfessional(p.id)}>{p.name.split(" ")[0]}</Button>
          ))}
        </div>

        {/* Monthly calendar (only when monthly view) */}
        {viewMode === "monthly" && (() => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const firstDay = new Date(year, month, 1);
          const lastDay = new Date(year, month + 1, 0);
          const startPad = firstDay.getDay();
          const totalDays = lastDay.getDate();
          const cells: (Date | null)[] = [];
          for (let i = 0; i < startPad; i++) cells.push(null);
          for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
          return (
            <div className="glass rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-7 gap-1">
                {weekDayLabels.map((d) => (<span key={d} className="text-xs text-muted-foreground text-center">{d}</span>))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => (
                  <button key={i} disabled={!date} onClick={() => date && setSelectedDate(date)} className={cn("h-9 rounded-lg text-sm font-medium transition-all", !date && "invisible", date && isSelected(date) && "bg-primary text-primary-foreground", date && isToday(date) && !isSelected(date) && "border border-primary", date && !isSelected(date) && "hover:bg-secondary")}>
                    {date?.getDate()}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Agenda Content */}
        <div className="glass rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === "weekly" ? (
            <div className="overflow-auto max-h-[65vh]">
              <WeeklyAgendaGrid
                weekDates={weekDates}
                appointmentsByDate={appointmentsByDate}
                onWhatsApp={handleWhatsApp}
                onConclude={handleConcludeClick}
                onManage={handleEditClick}
                onStatusChange={handleStatusChange}
                onSlotClick={handleWeeklySlotClick}
                onDragEnd={handleDragEnd}
              />
            </div>
          ) : (
            <div className="p-3 overflow-y-auto max-h-[65vh]">
              <h3 className="font-semibold text-center text-sm mb-2">
                {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <AgendaGrid
                appointments={dailyAppointments}
                onWhatsApp={handleWhatsApp}
                onConclude={handleConcludeClick}
                onManage={handleEditClick}
                onStatusChange={handleStatusChange}
                onSlotClick={handleSlotClick}
                onDragEnd={handleDragEnd}
              />
            </div>
          )}
        </div>
      </div>

      <EditAppointmentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        appointment={editingAppointment}
        services={servicesData}
        professionals={professionals}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
      />

      <CreateAppointmentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        defaultTime={createDefaultTime}
        date={createDefaultDate || dateStr}
        barbershopId={barbershop?.id || ""}
        services={servicesData}
        professionals={professionals}
        onSave={handleCreateSave}
      />

      <ConcludeDialog
        open={concludeDialogOpen}
        onOpenChange={setConcludeDialogOpen}
        serviceName={concludingAppointment?.service_name || ""}
        servicePrice={concludingAppointment?.total || 0}
        onConfirm={handleConcludeConfirm}
      />
    </PageLayout>
  );
}