import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { ServiceStep } from "@/components/booking/ServiceStep";
import { BarberStep } from "@/components/booking/BarberStep";
import { DateStep } from "@/components/booking/DateStep";
import { TimeStep } from "@/components/booking/TimeStep";
import { ClientInfoStep } from "@/components/booking/ClientInfoStep";
import { ConfirmStep } from "@/components/booking/ConfirmStep";
import { PixPaymentStep } from "@/components/booking/PixPaymentStep";
import { BookingService, BookingBarber, findBarbershopBySlug, getServicesForBarbershop, getBarbersForBarbershop, isSlotStillAvailable, generateTimeSlots, addBookingAppointment } from "@/data/mockBookingData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export default function PublicBooking() {
  // 1. Corrigido: tipagem explícita e segura para useParams
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados do fluxo
  const [step, setStep] = useState(1);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [services, setServices] = useState<BookingService[]>([]);
  const [barbers, setBarbers] = useState<BookingBarber[]>([]);
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<BookingBarber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [showPix, setShowPix] = useState(false);
  const [loading, setLoading] = useState(true); // Novo estado para evitar tela em branco inicial

  // 2. Efeito para carregar a barbearia baseado no slug da URL
  useEffect(() => {
    if (!slug) {
      toast({ title: "Erro", description: "Barbearia não encontrada na URL.", variant: "destructive" });
      navigate("/", { replace: true });
      return;
    }

    const loadBarbershop = async () => {
      setLoading(true);
      // Primeiro tenta do mock (local)
      let shop = findBarbershopBySlug(slug);
      
      // Se não achar no mock, tenta buscar no Supabase (caso a barbearia seja real)
      if (!shop) {
        const { data, error } = await supabase
          .from("barbershops")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error || !data) {
          toast({ title: "Erro", description: "Barbearia não encontrada.", variant: "destructive" });
          navigate("/", { replace: true });
          setLoading(false);
          return;
        }
        shop = data;
      }

      setBarbershop(shop);
      // Carrega serviços e barbeiros daquela barbearia
      const shopServices = getServicesForBarbershop(shop.id);
      const shopBarbers = getBarbersForBarbershop(shop.id);
      setServices(shopServices);
      setBarbers(shopBarbers);
      setLoading(false);
    };

    loadBarbershop();
  }, [slug, navigate, toast]);

  // 3. Renderiza um Loading enquanto busca os dados (Evita a tela em branco)
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 4. Se por algum motivo a barbearia não existir após o loading
  if (!barbershop) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-bold mb-2">Barbearia não encontrada</h1>
          <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
        </div>
      </div>
    );
  }

  const steps = [
    { label: "Serviço" },
    { label: "Profissional" },
    { label: "Data" },
    { label: "Horário" },
    { label: "Dados" },
    { label: "Confirmação" },
  ];

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !clientName.trim()) {
      toast({ title: "Erro", description: "Preencha todos os dados obrigatórios.", variant: "destructive" });
      return;
    }

    // Verifica disponibilidade real antes de confirmar
    const stillAvailable = isSlotStillAvailable(selectedBarber.id, selectedDate.toISOString().split("T")[0], selectedTime, selectedService.duration_minutes);
    if (!stillAvailable) {
      toast({ title: "Erro", description: "Este horário acabou de ser ocupado. Escolha outro.", variant: "destructive" });
      return;
    }

    const newAppointment = {
      id: `a_${Date.now()}`,
      barber_id: selectedBarber.id,
      date: selectedDate.toISOString().split("T")[0],
      time: selectedTime,
      duration_minutes: selectedService.duration_minutes,
      status: "agendado",
    };

    addBookingAppointment(newAppointment);
    toast({ title: "Agendamento confirmado! ✅", description: "Agora realize o pagamento via Pix." });
    setShowPix(true);
  };

  const handlePixComplete = () => {
    toast({ title: "Pagamento concluído! ✅", description: "Seu agendamento está garantido." });
    navigate("/");
  };

  // Se estiver na etapa de pagamento Pix
  if (showPix && selectedService) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setShowPix(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Pagamento</h1>
          </div>
        </header>
        <div className="p-4">
          <PixPaymentStep
            amount={selectedService.price}
            merchantName={barbershop.name}
            merchantCity="Sua Cidade"
            pixKey="12345678900" // Exemplo
          />
        </div>
      </div>
    );
  }

  // Renderização do fluxo normal
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Agendamento</h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        <StepIndicator steps={steps.map(s => s.label)} currentStep={step} />

        <div className="mt-6">
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
                ? generateTimeSlots(selectedService.duration_minutes, [])
                : []
              }
              selectedTime={selectedTime}
              onSelect={setSelectedTime}
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
        </div>

        <div className="flex justify-between mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          )}
          {step < 6 && (
            <Button
              className="ml-auto"
              onClick={() => {
                // Validações simples antes de avançar
                if (step === 1 && !selectedService) {
                  toast({ title: "Selecione um serviço", variant: "destructive" });
                  return;
                }
                if (step === 2 && !selectedBarber) {
                  toast({ title: "Selecione um profissional", variant: "destructive" });
                  return;
                }
                if (step === 3 && !selectedDate) {
                  toast({ title: "Selecione uma data", variant: "destructive" });
                  return;
                }
                if (step === 4 && !selectedTime) {
                  toast({ title: "Selecione um horário", variant: "destructive" });
                  return;
                }
                if (step === 5 && (!clientName || !clientPhone)) {
                  toast({ title: "Preencha seus dados", variant: "destructive" });
                  return;
                }
                setStep(step + 1);
              }}
            >
              Avançar
            </Button>
          )}
          {step === 6 && (
            <Button className="ml-auto" onClick={handleConfirm}>
              Confirmar Agendamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}