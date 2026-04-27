import { Building2, Share2, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Building2,
    title: "Cadastre sua barbearia",
    description: "Crie sua conta em menos de 2 minutos e configure seus serviços e profissionais.",
  },
  {
    icon: Share2,
    title: "Compartilhe seu link",
    description: "Envie o link de agendamento para seus clientes via WhatsApp, Instagram ou cartão.",
  },
  {
    icon: CalendarCheck,
    title: "Receba agendamentos",
    description: "Seus clientes agendam sozinhos e você recebe tudo organizado automaticamente.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-20 lg:py-28 bg-secondary/30">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Como <span className="text-gradient">funciona?</span>
          </h2>
          <p className="text-muted-foreground text-lg">3 passos simples para transformar sua barbearia</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center space-y-4 animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/40 to-transparent" />
              )}
              <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center relative">
                <step.icon className="h-8 w-8 text-primary" />
                <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
