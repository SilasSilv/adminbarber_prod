import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessScreenProps {
  barbershopName: string;
  onReset: () => void;
}

export function SuccessScreen({ barbershopName, onReset }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">Agendamento confirmado!</h2>
      <p className="text-muted-foreground max-w-sm mb-8">
        Seu horário foi reservado com sucesso na <span className="font-semibold text-foreground">{barbershopName}</span>. Te esperamos!
      </p>
      <Button onClick={onReset} variant="outline" size="lg">
        Fazer novo agendamento
      </Button>
    </div>
  );
}
