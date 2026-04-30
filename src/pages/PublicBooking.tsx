import { useState, useEffect } from "react";
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

  // Estados do fluxo de agendamento
  const [step, setStep] = useState(1);
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

  // Carrega a barbearia pelo slug
  useEffect(() => {
    if (!slug) {
      toast({
        title: "Erro",
        description: "Slug da barbearia não encontrado na URL.",
        variant: "destructive",
      });
      navigate("/", { replace: true });
      return;
    }

    const loadBarbershopAndServices = async () => {
      setLoading(true);
      try {
        // Busca a barbearia pelo slug
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

        // Busca os serviços ativos
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("id, name, price, duration_minutes")
          .eq("barbershop_id", shop.id)
          .eq("active", true)
          .order("name"); // CORREÇÃO: ordem correta aqui

        if (servicesError) {
          console.error("Services fetch error:", servicesError);
        } else {
          setServices(servicesData || []);
        }

        // Busca os barbeiros
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
  }, [slug, navigate, toast]);

  if (loading) {
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

  const steps = [
    { label: "Serviço" },
    { label: "Profissional" },
    { label: "Data" },
    { label: "Horário" },
    { label: "Dados" },
    { label: "Confirmação" },
  ];

  const handleConfirm = async (paymentMethod: "pix" | "in_person") => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !clientName.trim()) {
      toast({ title: "Erro", description: "Preencha todos os dados obrigatórios.", variant: "destructive" });
      return;
    }

    // Calcula o horário de término
    const endTime = addMinutesToTime(selectedTime, selectedService.duration_minutes);

    // Salva o agendamento no banco de dados
    setSaving(true);
    const { data, error } = await supabase
      .from("appointments")
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
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Agendamento confirmado! ✅", description: "Seu horário foi reservado." });
    setShowSuccess(true);
  };

  // Tela de sucesso
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center space-y-6">
          <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
          <h1 className="text-2xl font-bold">Agendamento Confirmado! ✅</h1>
          <p className="text-muted-foreground">
            Seu horário foi reservado com sucesso na <span className="font-semibold text-foreground">{barbershop.name}</span>.
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedService?.name} com {selectedBarber?.name} às {selectedTime} no dia {selectedDate?.toLocaleDateString("pt-BR")}
          </p>
          <Button asChild variant="outline" className="w-full">
            <a href="/">Voltar ao Início</a>
          </Button>
        </Card>
      </div>
    );
  }

  // Tela de pagamento Pix
  if (showPayment && selectedService) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass border-b border-border/50">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setShowPayment(false)}>
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
            pixKey="12345678900" // Substituir pela chave real da barbearia
          />
          <div className="mt-4 space-y-3">
            <Button 
              variant="gold"               size="lg" 
              className="w-full gap-2"
              onClick={() => handleConfirm("pix")}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Já realizei o pagamento"
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full gap-2"
              onClick={() => handleConfirm("in_person")}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Vou pagar na barbearia"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

      <main className="p-4 max-w-md mx-auto">
        <StepIndicator steps={steps.map(s => s.label)} currentStep={step} />

        <div className="mt-6">
          {step === 1 && (
            <ServiceStep              services={services}
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
                : []}
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
              Voltar            </Button>
          )}
          {step < 6 && (
            <Button
              className="ml-auto"
              onClick={() => {
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
            <Button 
              className="ml-auto" 
              onClick={() => setShowPayment(true)}
            >
              Confirmar Agendamento
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

// Função auxiliar para gerar horários disponíveis (simplificada)
function generateTimeSlots(durationMinutes: number, occupiedSlots: any[]): string[] {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    slots.push(time);
    if (hour < 20) {
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
  }
  return slots;
}