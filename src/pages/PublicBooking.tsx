import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/booking/StepIndicator";
import { ServiceStep } from "@/components/booking/ServiceStep";
import { BarberStep } from "@/components/booking/BarberStep";
import { DateStep } from "@/components/booking/DateStep";
import { TimeStep } from "@/components/booking/TimeStep";
import { ClientInfoStep } from "@/components/booking/ClientInfoStep";
import { ConfirmStep } from "@/components/booking/ConfirmStep";
import { PixPaymentStep } from "@/components/booking/PixPaymentStep";
import { BookingService, BookingBarber } from "@/data/mockBookingData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ... (keep existing imports and interface definitions)

export default function PublicBooking() {
  // ... (keep existing state variables)

  const handleConfirm = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !clientName.trim()) {
      toast({ title: "Erro", description: "Preencha todos os dados obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      // Check if client already exists by phone, otherwise create
      const phone = clientPhone.trim();
      if (phone) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("barbershop_id", barbershop!.id)
          .eq("whatsapp", phone)
          .maybeSingle();

        if (!existing) {
          await supabase.from("clients").insert({
            barbershop_id: barbershop!.id,
            name: clientName.trim(),
            whatsapp: phone,
          });
        }
      }

      const { data: created, error } = await supabase.from("appointments").insert({
        barbershop_id: barbershop!.id,
        professional_id: selectedBarber.id,
        service_id: selectedService.id,
        date: selectedDate.toISOString().split("T")[0],
        start_time: selectedTime,
        end_time: addMinutesToTime(selectedTime, selectedService.duration_minutes),
        client_name: clientName,
        client_phone: clientPhone,
        total: selectedService.price,
        status: "agendado",
      }).select("id").single();
      
      if (error) throw error;

      // Tentar inscrever o cliente para receber lembrete 2h antes (Web Push)
      if (created?.id) {
        try {
          const { subscribeToReminder, isPushSupported } = await import("@/lib/push");
          if (isPushSupported()) {
            const ok = await subscribeToReminder(created.id);
            if (ok) {
              toast({
                title: "Lembrete ativado 🔔",
                description: "Você receberá uma notificação 2h antes do horário.",
              });
            }
          }
        } catch (e) {
          console.warn("Push subscription falhou (não bloqueia agendamento):", e);
        }
      }

      toast({ title: "Agendamento confirmado! ✅", description: "Agora realize o pagamento via Pix." });
      setShowPix(true);
    } catch (error: any) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
    }
  };

  // ... (keep rest of the component)
}