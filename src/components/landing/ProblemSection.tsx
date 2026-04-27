import { AlertTriangle } from "lucide-react";

const problems = [
  "Horários duplicados e confusão na agenda",
  "Clientes esquecendo o agendamento",
  "Falta de controle financeiro",
  "Perda de tempo respondendo mensagens no WhatsApp",
  "Zero visão sobre faturamento e desempenho",
];

export function ProblemSection() {
  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Sua barbearia ainda funciona no{" "}
              <span className="text-gradient">papel ou WhatsApp?</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Se você se identifica com algum desses problemas, é hora de mudar.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {problems.map((problem, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-card/60 border border-border/50 animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="mt-0.5 h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <p className="text-foreground font-medium">{problem}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
