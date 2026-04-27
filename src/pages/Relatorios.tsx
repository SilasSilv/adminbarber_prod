import { useState } from "react";
import { ArrowLeft, Calendar, TrendingUp, Scissors, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";

export default function Relatorios() {
  const navigate = useNavigate();

  const reports = [
    {
      title: "Faturamento do Mês",
      value: "R$ 8.450",
      icon: <TrendingUp className="h-5 w-5" />,
      trend: { value: 15, positive: true },
    },
    {
      title: "Total de Atendimentos",
      value: "186",
      icon: <Calendar className="h-5 w-5" />,
      trend: { value: 8, positive: true },
    },
    {
      title: "Clientes Ativos",
      value: "124",
      icon: <Users className="h-5 w-5" />,
      trend: { value: 12, positive: true },
    },
    {
      title: "Serviço Mais Popular",
      value: "Corte + Barba",
      icon: <Scissors className="h-5 w-5" />,
    },
  ];

  const barberStats = [
    { name: "Carlos Silva", appointments: 68, revenue: 3120, commission: 1560 },
    { name: "João Santos", appointments: 62, revenue: 2790, commission: 1255 },
    { name: "Pedro Oliveira", appointments: 56, revenue: 2540, commission: 1270 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Relatórios</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Period Selector */}
        <div className="flex gap-2">
          <Button variant="default" size="sm">Mês Atual</Button>
          <Button variant="outline" size="sm">Semana</Button>
          <Button variant="outline" size="sm">Período</Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {reports.map((report, index) => (
            <StatCard
              key={index}
              title={report.title}
              value={report.value}
              icon={report.icon}
              trend={report.trend}
              className="animate-fade-in"
            />
          ))}
        </div>

        {/* Barber Performance */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Desempenho por Barbeiro</h3>
          {barberStats.map((barber, index) => (
            <div
              key={barber.name}
              className="glass rounded-xl p-4 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-bold">
                      {barber.name.charAt(0)}
                    </span>
                  </div>
                  <span className="font-semibold">{barber.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {barber.appointments} atendimentos
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Faturamento</p>
                  <p className="font-semibold text-lg">R$ {barber.revenue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Comissão</p>
                  <p className="font-semibold text-lg text-primary">
                    R$ {barber.commission.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
