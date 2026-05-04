import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { ServiceStep } from "@/components/booking/ServiceStep";
import { BarberStep } from "@/components/booking/BarberStep";
import { DateStep } from "@/components/booking/DateStep";
import { TimeStep } from "@/components/booking/TimeStep";
import { ClientInfoStep } from "@/components/booking/ClientInfoStep";
import { ConfirmStep } from "@/components/booking/ConfirmStep";
import { PixPaymentStep } from "@/components/booking/PixPaymentStep";
import { subscribeToReminder } from "@/lib/push";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export default function PublicBooking() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State for the multi‑step flow  const [step, setStep] = useState(1);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<{ time: string; duration: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);

  // Use a ref to avoid calling setStep during render cycles
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Load the barbershop and its services when the slug is available
  useEffect(() => {
    if (!slug) {
      toast({
        title: "Erro",
        description: "Slug da barbearia não encontrado na URL.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
      return;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }

    const loadBarbershopAndServices = async () => {
      setLoading(true);
      try {
        // Fetch the barbershop by slug
        const { data: shopData, error: shopError } = await supabase
          .from("barbershops")
          .select("*")
          .eq("slug", slug)
          .single();

        if (shopError || !shopData) {
          toast({
            title: "Erro",
            description: "Barbearia não encontrada.",
            variant: "destructive",
          });
          navigate("/", { replace: true });
          setLoading(false);
          return;
        }

        const shop = shopData;
        setBarbershop(shop);

        // Fetch active services
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, name, price, duration_minutes")
          .eq("barbershop_id", shop.id)
          .eq("active", true)
          .order("name");

        if (servicesError) {
          console.error("Services fetch error:", servicesError);
        } else {
          setServices(servicesData || []);
        }

        // Fetch barbers (professionals) for the shop
        const { data: barbersData, error: barbersError } = await supabase
          .from("professionals")
          .select("id, name")
          .eq("barbershop_id", shop.id)
          .eq("active", true);

        if (barbersError) {
          console.error("Barbers fetch error:", barbersError);
        } else {
          setBarbers(barbersData || []);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        toast({
          title: "Erro",
          description: "Ocorreu um erro inesperado.",
          variant: "destructive",
        });
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadBarbershopAndServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, navigate, toast]);

  // Fetch occupied slots whenever the selected professional or date changes  useEffect(() => {
    if (!barbershop || !selectedBarber || !selectedDate) {
      setOccupiedSlots([]);
      return;
    }

    const fetchOccupiedSlots = async () => {
      setLoadingSlots(true);
      const dateStr = selectedDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("appointments")
        .select("start_time, end_time, status")
        .eq("barbershop_id", barbershop.id)
        .eq("professional_id", selectedBarber.id)
        .eq("date", dateStr)
        .not("status", "in", '("cancelado","faltou")');

      if (error) {
        console.error("Error fetching occupied slots:", error);
        setOccupiedSlots([]);
      } else {
        const occupied = (data || []).map((apt: any) => ({
          time: apt.start_time?.substring(0, 5) || "",
          duration: (() => {
            const start = apt.start_time?.substring(0, 5) || "00:00";
            const end = apt.end_time?.substring(0, 5) || "00:00";
            const [sh, sm] = start.split(":").map(Number);
            const [eh, em] = end.split(":").map(Number);
            return (eh * 60 + em) - (sh * 60 + sm);
          })(),
        }));
        setOccupiedSlots(occupied);
      }
      setLoadingSlots(false);
    };

    fetchOccupiedSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps  }, [barbershop, selectedBarber, selectedDate]);

  // Helper to generate time slots while filtering out occupied ones
  const generateTimeSlots = useCallback(
    (durationMinutes: number, occupied: { time: string; duration: number }[]) => string[],
    [durationMinutes, occupied]
  ) => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 20; hour++) {
      const baseTime = `${hour.toString().padStart(2, "0")}:00`;
      const isOccupiedBase = occupied.some(
        (occ) => {
          const occStart = parseInt(occ.time.split(":")[0]) * 60 + parseInt(occ.time.split(":")[1]);
          const occEnd = occStart + occ.duration;
          const slotStart = hour * 60;
          const slotEnd = slotStart + durationMinutes;
          return slotStart < occEnd && slotEnd > occStart;
        }
      );
      if (!isOccupiedBase) slots.push(baseTime);

      const baseTime30 = `${hour.toString().padStart(2, "0")}:30`;
      const isOccupied30 = occupied.some(
        (occ) => {
          const occStart = parseInt(occ.time.split(":")[0]) * 60 + parseInt(occ.time.split(":")[1]);
          const occEnd = occStart + occ.duration;
          const slotStart = hour * 60 + 30;
          const slotEnd = slotStart + durationMinutes;
          return slotStart < occEnd && slotEnd > occStart;
        }
      );
      if (!isOccupied30) slots.push(baseTime30);
    }
    return slots;
  };

  // Handler for the "Avançar" button – uses the ref to avoid stale state
  const handleNext = useCallback(() => {
    // Guard against calling setStep during a render cycle that hasn't been committed yet    if (stepRef.current < 6) {
      setStep(stepRef.current + 1);
    }
  }, []);

  // Handler for confirming the booking (shows payment step)
  const handleConfirm = async (paymentMethod: "pix" | "in_person") => {
    if (
      !selectedService ||
      !selectedBarber ||
      !selectedDate ||
      !selectedTime ||
      !clientName.trim()
    ) {
      toast({
        title: "Erro",
        description: "Preencha todos os dados obrigatórios.",
        variant: "destructive",
      });
      return;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }

    // Calculate end time based on selected service duration
    const endTime = addMinutesToTime(selectedTime, selectedService.duration_minutes);

    // Persist the appointment
    setSaving(true);
    const { data, error } = await supabase      .from("appointments")
      .insert({
        barbershop_id: barbershop.id,
        professional_id: selectedBarber.id,
        service_id: selectedService.id,
        date: selectedDate.toISOString().split("T")[0],
        start_time: selectedTime,
        end_time: endTime,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        total: selectedService.price,
        status: "agendado",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setCreatedAppointmentId(data.id);
    toast({
      title: "Agendamento confirmado! ✅",
      description: "Seu horário foi reservado.",
    });
    setShowSuccess(true);
  }, [
    selectedService,
    selectedBarber,
    selectedDate,
    selectedTime,
    clientName,
    clientPhone,
    barbershop,
    saving,
  ]);

  // Show the success screen after a booking is confirmed  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          <h1 className="text-2xl font-bold">Agendamento Confirmado! ✅</h1>
          <p className="text-muted-foreground">
            Seu horário foi reservado com sucesso na <span className="font-semibold text-foreground">
              {barbershop?.name || "Barbearia"}
            </span>.
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedService?.name} com {selectedBarber?.name} às {selectedTime} no dia {selectedDate?.toLocaleDateString("pt-BR")}
          </p>
          <Button
            onClick={async () => {
              if (createdAppointmentId) {
                const ok = await subscribeToReminder(createdAppointmentId);
                if (ok) {
                  toast({
                    title: "Lembretes ativados! 🔔",
                    description: "Você receberá notificações antes do seu horário.",
                  });
                } else {
                  toast({
                    title: "Permissão necessária",
                    description: "Ative as notificações no navegador para receber lembretes.",
                    variant: "destructive",
                  });
                }
              }
            }}
            variant="gold"
            className="w-full gap-2"
          >
            Ativar Lembretes de Agendamento
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/">Voltar ao Início</a>
          </Button>
        </Card>
      </div>
    );
  }

  // Render the multi‑step booking UI only when the barbearia data is ready  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Barbearia não encontrada</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  // Determine which step component to render
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Agendamento</h1>
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {/* Step Indicator */}
        <StepIndicator steps={["Serviço", "Profissional", "Data", "Horário", "Dados", "Confirmação"]} currentStep={step} />

        {/* Step Content */}
        {step === 1 && (
          <ServiceStep
            services={services}
            selectedId={selectedService?.id || null}
            onSelect={setSelectedService}
          />
        )}
        {step === 2 && (
          <BarberStep
            barbers={barbers}
            selectedId={selectedBarber?.id || null}
            onSelect={setSelectedBarber}
          />
        )}
        {step === 3 && (
          <DateStep selectedDate={selectedDate} onSelect={setSelectedDate} />
        )}
        {step === 4 && (
          <TimeStep
            slots={selectedService && selectedDate
              ? generateTimeSlots(selectedService.duration_minutes, occupiedSlots)
              : []}
            selectedTime={selectedTime}
            onSelect={setSelectedTime}
            loading={loadingSlots}
          />
        )}
        {step === 5 && (
          <ClientInfoStep
            name={clientName}
            phone={clientPhone}
            onNameChange={setClientName}
            onPhoneChange={setClientPhone}
          />
        )}
        {step === 6 && selectedService && selectedBarber && selectedDate && selectedTime && (
          <ConfirmStep
            service={selectedService}
            barber={selectedBarber}
            date={selectedDate}
            time={selectedTime}
            clientName={clientName}
            clientPhone={clientPhone}
          />
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => {
              if (stepRef.current > 1) {
                setStep(stepRef.current - 1);
              }
            }}>
              Voltar
            </Button>
          )}
          {step < 6 && (
            <Button
              className="ml-auto"
              onClick={handleNext}
            >
              Avançar
            </Button>
          )}
          {step === 6 && (
            <Button
              className="ml-auto"
              onClick={() => setShowPayment(true)}
            >
              Confirmar Agendamento            </Button>
          )}
        </div>
      </main>
    </div>
  );
}