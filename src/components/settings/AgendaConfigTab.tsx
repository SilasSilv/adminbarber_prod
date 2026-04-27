import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/context/BarbershopContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Loader2, Calendar, Clock, User, Plus, Trash2 } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

interface Professional {
  id: string;
  name: string;
}

interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
}

interface DayConfig {
  day_of_week: number;
  is_day_off: boolean;
  blocks: TimeBlock[];
}

const DEFAULT_BLOCK: Omit<TimeBlock, "id"> = {
  start_time: "08:00",
  end_time: "18:00",
};

const generateId = () => crypto.randomUUID();

export function AgendaConfigTab() {
  const { barbershop } = useBarbershop();
  const { toast } = useToast();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedProfId, setSelectedProfId] = useState<string>("");
  const [days, setDays] = useState<DayConfig[]>([]);
  const [slotDuration, setSlotDuration] = useState(30);
  const [intervalMinutes, setIntervalMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load professionals
  useEffect(() => {
    if (!barbershop) return;
    supabase
      .from("professionals")
      .select("id, name")
      .eq("barbershop_id", barbershop.id)
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        const profs = (data || []) as Professional[];
        setProfessionals(profs);
        if (profs.length > 0 && !selectedProfId) {
          setSelectedProfId(profs[0].id);
        }
        setLoading(false);
      });
  }, [barbershop]);

  // Load schedule for selected professional
  useEffect(() => {
    if (!selectedProfId) return;
    setLoading(true);
    supabase
      .from("professional_schedules")
      .select("*")
      .eq("professional_id", selectedProfId)
      .then(({ data }) => {
        const existing = (data || []) as any[];

        // Group by day_of_week
        const grouped: Record<number, any[]> = {};
        existing.forEach((row) => {
          if (!grouped[row.day_of_week]) grouped[row.day_of_week] = [];
          grouped[row.day_of_week].push(row);
        });

        // Set global slot config from first record found
        if (existing.length > 0) {
          setSlotDuration(existing[0].slot_duration || 30);
          setIntervalMinutes(existing[0].interval_minutes || 0);
        }

        const weekConfig: DayConfig[] = DAYS_OF_WEEK.map(({ value }) => {
          const dayRows = grouped[value];
          if (dayRows && dayRows.length > 0) {
            const isDayOff = dayRows[0].is_day_off;
            return {
              day_of_week: value,
              is_day_off: isDayOff,
              blocks: isDayOff
                ? [{ id: generateId(), ...DEFAULT_BLOCK }]
                : dayRows.map((r: any) => ({
                    id: generateId(),
                    start_time: r.start_time?.substring(0, 5) || "08:00",
                    end_time: r.end_time?.substring(0, 5) || "18:00",
                  })),
            };
          }
          return {
            day_of_week: value,
            is_day_off: false,
            blocks: [{ id: generateId(), ...DEFAULT_BLOCK }],
          };
        });

        setDays(weekConfig);
        setLoading(false);
      });
  }, [selectedProfId]);

  const toggleDayOff = (dayOfWeek: number, checked: boolean) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek ? { ...d, is_day_off: !checked } : d
      )
    );
  };

  const updateBlock = (dayOfWeek: number, blockId: string, field: keyof TimeBlock, value: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek
          ? {
              ...d,
              blocks: d.blocks.map((b) =>
                b.id === blockId ? { ...b, [field]: value } : b
              ),
            }
          : d
      )
    );
  };

  const addBlock = (dayOfWeek: number) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek
          ? {
              ...d,
              blocks: [
                ...d.blocks,
                { id: generateId(), start_time: "13:00", end_time: "18:00" },
              ],
            }
          : d
      )
    );
  };

  const removeBlock = (dayOfWeek: number, blockId: string) => {
    setDays((prev) =>
      prev.map((d) =>
        d.day_of_week === dayOfWeek && d.blocks.length > 1
          ? { ...d, blocks: d.blocks.filter((b) => b.id !== blockId) }
          : d
      )
    );
  };

  const handleSave = async () => {
    if (!selectedProfId) return;
    setSaving(true);

    // Build rows: one row per block per day
    const rows: any[] = [];
    days.forEach((day) => {
      if (day.is_day_off) {
        rows.push({
          professional_id: selectedProfId,
          barbershop_id: barbershop?.id,
          day_of_week: day.day_of_week,
          start_time: "08:00",
          end_time: "18:00",
          slot_duration: slotDuration,
          interval_minutes: intervalMinutes,
          is_day_off: true,
          updated_at: new Date().toISOString(),
        });
      } else {
        day.blocks.forEach((block) => {
          rows.push({
            professional_id: selectedProfId,
            barbershop_id: barbershop?.id,
            day_of_week: day.day_of_week,
            start_time: block.start_time,
            end_time: block.end_time,
            slot_duration: slotDuration,
            interval_minutes: intervalMinutes,
            is_day_off: false,
            updated_at: new Date().toISOString(),
          });
        });
      }
    });

    // Delete existing then insert
    await supabase
      .from("professional_schedules")
      .delete()
      .eq("professional_id", selectedProfId);

    const { error } = await supabase
      .from("professional_schedules")
      .insert(rows as any);

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agenda salva com sucesso! ✅" });
    }
  };

  if (loading && professionals.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Cadastre profissionais primeiro para configurar a agenda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Professional selector */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <User className="h-4 w-4 text-primary" /> Profissional
        </h3>
        <Select value={selectedProfId} onValueChange={setSelectedProfId}>
          <SelectTrigger className="h-12 bg-secondary">
            <SelectValue placeholder="Selecionar profissional" />
          </SelectTrigger>
          <SelectContent>
            {professionals.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Global slot config */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Configuração Padrão de Slots
        </h3>
        <p className="text-sm text-muted-foreground">
          Defina valores padrão para aplicar a todos os dias de uma vez.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Duração do slot (min)</Label>
            <Select
              value={slotDuration.toString()}
              onValueChange={(v) => setSlotDuration(parseInt(v))}
            >
              <SelectTrigger className="h-10 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 20, 30, 45, 60].map((d) => (
                  <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Intervalo entre slots (min)</Label>
            <Select
              value={intervalMinutes.toString()}
              onValueChange={(v) => setIntervalMinutes(parseInt(v))}
            >
              <SelectTrigger className="h-10 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 5, 10, 15, 20, 30].map((d) => (
                  <SelectItem key={d} value={d.toString()}>{d} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Days of week */}
      <div className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Dias da Semana
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {DAYS_OF_WEEK.map(({ value, label }) => {
              const dayConfig = days.find((d) => d.day_of_week === value);
              if (!dayConfig) return null;
              return (
                <div
                  key={value}
                  className={`rounded-lg border p-3 transition-all ${
                    dayConfig.is_day_off
                      ? "border-border/50 bg-muted/30 opacity-60"
                      : "border-border bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!dayConfig.is_day_off}
                        onCheckedChange={(checked) => toggleDayOff(value, !!checked)}
                      />
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    {dayConfig.is_day_off && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Folga
                      </span>
                    )}
                  </div>

                  {!dayConfig.is_day_off && (
                    <div className="space-y-2 mt-2">
                      {dayConfig.blocks.map((block, idx) => (
                        <div key={block.id} className="flex items-end gap-2">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              {idx === 0 ? "Início" : `Início ${idx + 1}`}
                            </Label>
                            <Input
                              type="time"
                              value={block.start_time}
                              onChange={(e) => updateBlock(value, block.id, "start_time", e.target.value)}
                              className="h-9 bg-background text-sm"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              {idx === 0 ? "Fim" : `Fim ${idx + 1}`}
                            </Label>
                            <Input
                              type="time"
                              value={block.end_time}
                              onChange={(e) => updateBlock(value, block.id, "end_time", e.target.value)}
                              className="h-9 bg-background text-sm"
                            />
                          </div>
                          {dayConfig.blocks.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                              onClick={() => removeBlock(value, block.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 text-primary hover:text-primary"
                        onClick={() => addBlock(value)}
                      >
                        <Plus className="h-3 w-3" /> Adicionar horário
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Button
        variant="gold"
        size="lg"
        className="w-full gap-2"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
        Salvar Configuração da Agenda
      </Button>
    </div>
  );
}
