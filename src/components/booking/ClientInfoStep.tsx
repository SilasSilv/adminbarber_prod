import { Input } from "@/components/ui/input";
import { User, Phone } from "lucide-react";

interface ClientInfoStepProps {
  name: string;
  phone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
}

export function ClientInfoStep({ name, phone, onNameChange, onPhoneChange }: ClientInfoStepProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-semibold text-foreground">Seus dados</h2>
      <div className="space-y-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Seu nome"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="pl-10 h-12 bg-card border-border"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Telefone (11) 99999-9999"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="pl-10 h-12 bg-card border-border"
          />
        </div>
      </div>
    </div>
  );
}
