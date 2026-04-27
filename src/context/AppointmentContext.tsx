import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { Appointment, Transaction, PaymentMethod, AppointmentStatus, Product, AppointmentProduct } from "@/types/barbershop";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";

interface AppointmentContextType {
  appointments: Appointment[];
  transactions: Transaction[];
  products: Product[];
  appointmentProducts: AppointmentProduct[];
  loading: boolean;
  addAppointment: (appointment: Appointment) => Promise<boolean>;
  concludeAppointment: (appointmentId: string, paymentMethod: PaymentMethod, selectedProducts?: { productId: string; quantity: number }[]) => Promise<void>;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => Promise<void>;
  rescheduleAppointment: (appointmentId: string, newTime: string) => Promise<boolean>;
  isTimeSlotAvailable: (barberId: string, date: string, time: string, excludeId?: string) => boolean;
  refetch: () => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [appointmentProducts, setAppointmentProducts] = useState<AppointmentProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { barbershop } = useBarbershop();
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!barbershop) {
      setAppointments([]);
      setTransactions([]);
      setProducts([]);
      setAppointmentProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [apptRes, txnRes, prodRes, apRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("*, services(name, price, duration_minutes), professionals(name)")
        .eq("barbershop_id", barbershop.id)
        .order("date", { ascending: false }),
      supabase
        .from("transactions")
        .select("*, appointments(client_name, services(name), professionals(name))")
        .eq("barbershop_id", barbershop.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("active", true),
      supabase
        .from("appointment_products")
        .select("*, products(name, price)")
    ]);

    // Map appointments to legacy format
    const mappedAppointments: Appointment[] = (apptRes.data || []).map((row: any) => ({
      id: row.id,
      client_id: "",
      client: { id: "", name: row.client_name, whatsapp: row.client_phone || "", created_at: "" },
      service_id: row.service_id || "",
      service: row.services ? {
        id: row.service_id || "",
        name: row.services.name,
        price: Number(row.services.price),
        duration_minutes: row.services.duration_minutes,
        commission_percent: 50,
        active: true,
        created_at: "",
      } : undefined,
      barber_id: row.professional_id || "",
      barber: row.professionals ? {
        id: row.professional_id || "",
        name: row.professionals.name,
        commission_percent: 50,
        active: true,
        created_at: "",
      } : undefined,
      date: row.date,
      time: row.start_time?.substring(0, 5) || "00:00",
      duration_minutes: row.services?.duration_minutes || 30,
      status: row.status as AppointmentStatus,
      notes: row.notes || undefined,
      created_at: row.created_at,
    }));

    const mappedProducts: Product[] = (prodRes.data || []).map((row: any) => ({
      id: row.id,
      barberia_id: row.barbershop_id,
      name: row.name,
      price: Number(row.price),
      stock: row.stock,
      active: row.active,
      created_at: row.created_at,
    }));

    const mappedApptProducts: AppointmentProduct[] = (apRes.data || []).map((row: any) => ({
      id: row.id,
      appointment_id: row.appointment_id,
      product_id: row.product_id,
      product: row.products ? {
        id: row.product_id,
        barberia_id: "",
        name: row.products.name,
        price: Number(row.products.price),
        stock: null,
        active: true,
        created_at: "",
      } : undefined,
      quantity: row.quantity,
      unit_price: Number(row.unit_price),
      total: Number(row.total),
      created_at: row.created_at,
    }));

    const mappedTransactions: Transaction[] = (txnRes.data || []).map((row: any) => ({
      id: row.id,
      appointment_id: row.appointment_id || "",
      amount: Number(row.amount),
      products_amount: Number(row.products_amount),
      payment_method: row.payment_method as PaymentMethod,
      barber_commission: Number(row.barber_commission),
      created_at: row.created_at,
    }));

    setAppointments(mappedAppointments);
    setTransactions(mappedTransactions);
    setProducts(mappedProducts);
    setAppointmentProducts(mappedApptProducts);
    setLoading(false);
  }, [barbershop]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const isTimeSlotAvailable = (barberId: string, date: string, time: string, excludeId?: string): boolean => {
    return !appointments.some(
      (a) =>
        a.barber_id === barberId &&
        a.date === date &&
        a.time === time &&
        a.id !== excludeId &&
        a.status !== "cancelado" &&
        a.status !== "faltou"
    );
  };

  const addAppointment = async (appointment: Appointment): Promise<boolean> => {
    if (!barbershop) return false;

    if (!isTimeSlotAvailable(appointment.barber_id, appointment.date, appointment.time)) {
      toast({
        title: "Horário indisponível",
        description: "Este barbeiro já possui um agendamento nesse dia e horário.",
        variant: "destructive",
      });
      return false;
    }

    const duration = appointment.duration_minutes || 30;
    const [h, m] = appointment.time.split(":").map(Number);
    const totalMin = h * 60 + m + duration;
    const endTime = `${Math.floor(totalMin / 60).toString().padStart(2, "0")}:${(totalMin % 60).toString().padStart(2, "0")}`;

    const { error } = await supabase.from("appointments").insert({
      barbershop_id: barbershop.id,
      professional_id: appointment.barber_id || null,
      service_id: appointment.service_id || null,
      date: appointment.date,
      start_time: appointment.time,
      end_time: endTime,
      client_name: appointment.client?.name || "",
      client_phone: appointment.client?.whatsapp || "",
      total: appointment.service?.price || 0,
      status: "agendado",
      notes: appointment.notes || null,
    });

    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      return false;
    }

    toast({ title: "Sucesso! ✅", description: "Agendamento criado com sucesso." });
    await fetchAll();
    return true;
  };

  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status } : a))
    );

    const labels: Record<string, string> = {
      atendido: "marcado como atendido",
      cancelado: "cancelado",
      faltou: "marcado como faltou",
      confirmado: "confirmado",
      agendado: "reagendado",
    };
    toast({ title: "Status atualizado ✅", description: `Agendamento ${labels[status] || status}.` });
  };

  const rescheduleAppointment = async (appointmentId: string, newTime: string): Promise<boolean> => {
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return false;

    if (!isTimeSlotAvailable(appointment.barber_id, appointment.date, newTime, appointmentId)) {
      toast({
        title: "Horário indisponível",
        description: "Este barbeiro já possui um agendamento nesse horário.",
        variant: "destructive",
      });
      return false;
    }

    const duration = appointment.duration_minutes || 30;
    const [h, m] = newTime.split(":").map(Number);
    const totalMin = h * 60 + m + duration;
    const endTime = `${Math.floor(totalMin / 60).toString().padStart(2, "0")}:${(totalMin % 60).toString().padStart(2, "0")}`;

    const { error } = await supabase
      .from("appointments")
      .update({ start_time: newTime, end_time: endTime })
      .eq("id", appointmentId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }

    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, time: newTime } : a))
    );
    toast({ title: "Horário alterado ✅", description: `Agendamento remarcado para ${newTime}.` });
    return true;
  };

  const concludeAppointment = async (
    appointmentId: string,
    paymentMethod: PaymentMethod,
    selectedProducts?: { productId: string; quantity: number }[]
  ) => {
    if (!barbershop) return;
    const appointment = appointments.find((a) => a.id === appointmentId);
    if (!appointment) return;

    // Update status
    const { error } = await supabase
      .from("appointments")
      .update({ status: "atendido" })
      .eq("id", appointmentId);
    if (error) return;

    // Calculate products
    let productsAmount = 0;
    if (selectedProducts?.length) {
      const productRows = selectedProducts.map((sp) => {
        const product = products.find((p) => p.id === sp.productId);
        const unitPrice = product?.price || 0;
        const total = unitPrice * sp.quantity;
        productsAmount += total;
        return {
          appointment_id: appointmentId,
          product_id: sp.productId,
          quantity: sp.quantity,
          unit_price: unitPrice,
          total,
        };
      });
      await supabase.from("appointment_products").insert(productRows);
    }

    const serviceAmount = appointment.service?.price || 0;
    const totalAmount = serviceAmount + productsAmount;
    const commissionPercent = appointment.service?.commission_percent || 50;

    await supabase.from("transactions").insert({
      appointment_id: appointmentId,
      barbershop_id: barbershop.id,
      amount: totalAmount,
      products_amount: productsAmount,
      payment_method: paymentMethod,
      barber_commission: serviceAmount * (commissionPercent / 100),
    });

    // Update local state
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, status: "atendido" as const } : a))
    );

    const paymentLabel = paymentMethod === "pix" ? "Pix" : paymentMethod === "dinheiro" ? "Dinheiro" : paymentMethod === "cartao_credito" ? "Cartão Crédito" : "Cartão Débito";
    toast({
      title: "Atendimento concluído! ✅",
      description: `R$ ${totalAmount.toFixed(2)} registrado no caixa via ${paymentLabel}.${productsAmount > 0 ? ` (Produtos: R$ ${productsAmount.toFixed(2)})` : ""}`,
    });

    await fetchAll();
  };

  return (
    <AppointmentContext.Provider
      value={{
        appointments,
        transactions,
        products,
        appointmentProducts,
        loading,
        addAppointment,
        concludeAppointment,
        updateAppointmentStatus,
        rescheduleAppointment,
        isTimeSlotAvailable,
        refetch: fetchAll,
      }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentContext);
  if (!context) throw new Error("useAppointments must be used within AppointmentProvider");
  return context;
}
