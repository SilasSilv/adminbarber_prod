import { Package } from "lucide-react";
import { useAppointments } from "@/context/AppointmentContext";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

export function TopProductsSection() {
  const { appointmentProducts, products } = useAppointments();

  // Aggregate by product
  const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

  appointmentProducts.forEach((ap) => {
    const existing = productMap.get(ap.product_id);
    const productName = ap.product?.name || products.find((p) => p.id === ap.product_id)?.name || "Produto";
    if (existing) {
      existing.quantity += ap.quantity;
      existing.revenue += ap.total;
    } else {
      productMap.set(ap.product_id, {
        name: productName,
        quantity: ap.quantity,
        revenue: ap.total,
      });
    }
  });

  const sorted = Array.from(productMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const chartConfig: ChartConfig = {
    quantity: { label: "Quantidade", color: "hsl(var(--primary))" },
  };

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Produtos mais vendidos no mês
        </h3>
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Nenhum produto vendido ainda. Conclua atendimentos com produtos para ver os dados aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        Produtos mais vendidos no mês
      </h3>

      {/* Chart */}
      <div className="glass rounded-xl p-4">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="quantity"
              fill="hsl(var(--primary))"
              radius={[0, 6, 6, 0]}
              barSize={24}
            />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 text-muted-foreground font-medium">Produto</th>
              <th className="text-center p-3 text-muted-foreground font-medium">Qtd</th>
              <th className="text-right p-3 text-muted-foreground font-medium">Faturamento</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => (
              <tr key={i} className="border-b border-border/30 last:border-0">
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-center">{item.quantity}</td>
                <td className="p-3 text-right text-primary font-semibold">
                  R$ {item.revenue.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
