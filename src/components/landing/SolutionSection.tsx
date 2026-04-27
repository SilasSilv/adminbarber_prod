import { Check } from "lucide-react";

const benefits = [
  "Link público para agendamento online",
  "Agenda inteligente com bloqueio automático",
  "Gestão completa de clientes",
  "Controle financeiro detalhado",
  "Relatórios de faturamento",
  "Notificações automáticas",
];

export function SolutionSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl font-bold">
              O AdminBarber{" "}
              <span className="text-gradient">resolve tudo isso</span> para você
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {benefits.map((benefit, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-card/60 border border-border/50 animate-fade-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-success" />
                </div>
                <p className="text-foreground font-medium">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
