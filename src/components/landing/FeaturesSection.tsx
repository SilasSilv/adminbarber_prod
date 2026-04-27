import { Calendar, Users, DollarSign, BarChart3, UserPlus, Smartphone } from "lucide-react";

const features = [
  { icon: Calendar, title: "Agendamento Online", description: "Link público para seus clientes agendarem 24h, sem precisar ligar." },
  { icon: Users, title: "Gestão de Clientes", description: "Histórico completo, preferências e dados de cada cliente." },
  { icon: DollarSign, title: "Controle Financeiro", description: "Registre entradas, saídas e acompanhe seu caixa em tempo real." },
  { icon: BarChart3, title: "Relatórios", description: "Faturamento, serviços mais vendidos e desempenho por profissional." },
  { icon: UserPlus, title: "Multi-profissionais", description: "Gerencie vários barbeiros com agendas independentes." },
  { icon: Smartphone, title: "Acesso pelo Celular", description: "Sistema 100% responsivo. Use do celular, tablet ou computador." },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Tudo que você precisa,{" "}
            <span className="text-gradient">em um só lugar</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Funcionalidades pensadas para o dia a dia da barbearia
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
