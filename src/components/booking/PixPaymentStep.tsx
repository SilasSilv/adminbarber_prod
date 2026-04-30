import { useState, useEffect } from "react";
import { Copy, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";
import { generatePixCode } from "@/lib/pix";

interface PixPaymentStepProps {
  amount: number;
  merchantName: string;
  merchantCity: string;
  pixKey: string;
}

export function PixPaymentStep({ amount, merchantName, merchantCity, pixKey }: PixPaymentStepProps) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);
  const [showExpired, setShowExpired] = useState(false);

  useEffect(() => {
    const payload = generatePixCode({
      pixKey,
      amount,
      merchantName,
      merchantCity,
    });
    if (!payload) return;

    QRCode.toDataURL(payload, {
      width: 256,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    })
      .then(setQrDataUrl)
      .catch(() => {
        setQrDataUrl("");
      });
  }, [amount, merchantName, merchantCity, pixKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev === 0) {
          if (minutes === 0) {
            clearInterval(interval);
            setShowExpired(true);
            return 0;
          }
          setMinutes((m) => m - 1);
          return 59;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [minutes]);

  const isExpired = minutes === 0 && seconds === 0;

  const handleCopy = () => {
    const payload = generatePixCode({
      pixKey,
      amount,
      merchantName,
      merchantCity,
    });
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    setCopied(true);
    toast({ title: "Código Pix copiado! 📋" });
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-foreground mb-1">Pagamento via Pix</h2>
        <p className="text-muted-foreground text-sm">
          Escaneie o QR Code ou copie o código abaixo
        </p>
      </div>

      <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
        <p className="text-sm text-muted-foreground">Valor a pagar</p>
        <p className="text-3xl font-bold text-primary">R$ {amount.toFixed(2)}</p>
      </div>

      {qrDataUrl ? (
        <div className="flex justify-center">
          <div className="flex justify-center">
            <img src={qrDataUrl} alt="QR Code Pix" className="w-56 h-56" />
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-56 h-56 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {isExpired ? (
          <span className="text-destructive font-medium">Pagamento expirado</span>
        ) : (
          <span className="text-muted-foreground">
            Expira em <span className="font-semibold text-foreground">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground text-center">Pix Copia e Cola</p>
        <div
          onClick={handleCopy}
          className="cursor-pointer p-3 rounded-xl bg-secondary border border-border text-xs font-mono break-all leading-relaxed text-muted-foreground hover:border-primary/50 transition-colors"
        >
          {generatePixCode({
            pixKey,
            amount,
            merchantName,
            merchantCity,
          })}
        </div>
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleCopy}
          disabled={isExpired}
        >
          {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado!" : "Copiar código Pix"}
        </Button>
      </div>

      <div className="pt-2">
        <p className="text-xs text-muted-foreground text-center mb-2">
          Após realizar o pagamento, clique no botão abaixo
        </p>
        <Button
          variant="gold"
          className="w-full gap-2"
          onClick={() => {
            toast({ title: "Pagamento concluído!" });
          }}
          disabled={isExpired}
        >
          <CheckCircle2 className="h-4 w-4" />
          Já realizei o pagamento123
        </Button>
      </div>
    </div>
  );
}