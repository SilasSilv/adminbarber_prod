import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "success" | "error";

export default function ConfirmacaoAgendamento() {
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const action = (params.get("action") || "") as "confirm" | "cancel" | "";
  const token = params.get("t") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!id || !action || !token) {
        setStatus("error");
        setMessage("Link inválido ou incompleto.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("handle-appointment-action", {
        body: { appointment_id: id, action, token },
      });

      if (cancelled) return;

      if (error || (data as any)?.error) {
        setStatus("error");
        setMessage(((data as any)?.error as string) || error?.message || "Não foi possível processar.");
        return;
      }

      setStatus("success");
      setMessage(
        action === "confirm"
          ? "Agendamento confirmado! Te esperamos no horário marcado. ✂️"
          : "Agendamento cancelado. Esperamos te ver em outra ocasião.",
      );
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [id, action, token]);

  const isConfirm = action === "confirm";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
            <h1 className="text-2xl font-bold">Processando…</h1>
            <p className="text-muted-foreground">Aguarde um instante.</p>
          </>
        )}

        {status === "success" && (
          <>
            {isConfirm ? (
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            ) : (
              <XCircle className="w-16 h-16 mx-auto text-destructive" />
            )}
            <h1 className="text-2xl font-bold">
              {isConfirm ? "Agendamento confirmado ✅" : "Agendamento cancelado ❌"}
            </h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">Não foi possível concluir</h1>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link to="/">Voltar</Link>
        </Button>
      </Card>
    </main>
  );
}