import { useState, useRef } from "react";
import { MessageCircle, CheckCircle, Zap, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface AgendaAppointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  professional_name: string;
  start_time: string;
  end_time: string;
  date: string;
  status: string;
  total: number;
  is_encaixe: boolean;
  service_id: string | null;
  professional_id: string | null;
}

const SLOT_HEIGHT = 32;

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const STATUS_OPTIONS = [
  { value: "agendado", label: "Agendado", color: "text-primary" },
  { value: "confirmado", label: "Confirmado", color: "text-emerald-500" },
  { value: "em_atendimento", label: "Em atendimento", color: "text-amber-500" },
  { value: "atendido", label: "Concluído", color: "text-success" },
  { value: "cancelado", label: "Cancelado", color: "text-muted-foreground" },
  { value: "faltou", label: "Não compareceu", color: "text-destructive" },
];

interface AgendaTimelineCardProps {
  appointment: AgendaAppointment;
  startHour: number;
  column?: number;
  totalColumns?: number;
  onWhatsApp?: () => void;
  onConclude?: () => void;
  onManage?: () => void;
  onStatusChange?: (status: string) => void;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  isDragging?: boolean;
  dragOffsetY?: number;
}

export function AgendaTimelineCard({
  appointment,
  startHour,
  column = 0,
  totalColumns = 1,
  onWhatsApp,
  onConclude,
  onManage,
  onStatusChange,
  onDragStart,
  isDragging,
  dragOffsetY = 0,
}: AgendaTimelineCardProps) {
  const startMin = timeToMinutes(appointment.start_time);
  const endMin = timeToMinutes(appointment.end_time);
  const duration = endMin - startMin;

  const topOffset = ((startMin - startHour * 60) / 30) * SLOT_HEIGHT + (isDragging ? dragOffsetY : 0);
  const height = Math.max((duration / 30) * SLOT_HEIGHT - 2, 24);

  const statusStyles: Record<string, string> = {
    agendado: "bg-primary/15 border-primary/30",
    confirmado: "bg-emerald-500/15 border-emerald-500/30",
    em_atendimento: "bg-amber-500/20 border-amber-500/40",
    atendido: "bg-success/15 border-success/30 opacity-70",
    cancelado: "bg-muted/50 border-border opacity-50",
    faltou: "bg-destructive/15 border-destructive/30 opacity-60",
  };

  const cardStyle = appointment.is_encaixe
    ? "bg-warning/20 border-warning/40 border-dashed border-2"
    : statusStyles[appointment.status] || "bg-primary/15 border-primary/30";

  const LEFT_OFFSET = 64;
  const RIGHT_MARGIN = 8;
  const availableWidth = `calc(100% - ${LEFT_OFFSET + RIGHT_MARGIN}px)`;
  const columnWidth = `calc(${availableWidth} / ${totalColumns})`;
  const leftPos = `calc(${LEFT_OFFSET}px + ${availableWidth} * ${column} / ${totalColumns})`;

  return (
    <div
      className={cn(
        "absolute rounded-md px-2 py-1 border overflow-hidden transition-shadow z-10 cursor-pointer hover:ring-1 hover:ring-primary/40 select-none",
        cardStyle,
        isDragging && "ring-2 ring-primary shadow-xl z-50 opacity-90"
      )}
      style={{
        top: `${topOffset}px`,
        height: `${height}px`,
        left: leftPos,
        width: columnWidth,
        transition: isDragging ? "none" : "top 0.2s ease, box-shadow 0.2s ease",
      }}
      onClick={(e) => {
        if (isDragging) return;
        onManage?.();
      }}
    >
      <div className="flex items-start justify-between h-full">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {/* Drag handle */}
          {onDragStart && (
            <div
              className="shrink-0 cursor-grab active:cursor-grabbing touch-none p-0.5 -ml-1 text-muted-foreground/50 hover:text-muted-foreground"
              onMouseDown={(e) => { e.stopPropagation(); onDragStart(e); }}
              onTouchStart={(e) => { e.stopPropagation(); onDragStart(e); }}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
          )}
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <div className="flex items-center gap-1">
              {appointment.is_encaixe && <Zap className="h-2.5 w-2.5 text-warning shrink-0" />}
              <span className="font-semibold text-[13px] leading-tight truncate">{appointment.client_name}</span>
            </div>
            {height > 32 && (
              <span className="text-[11px] leading-tight text-muted-foreground truncate">
                {appointment.service_name} • {appointment.start_time}-{appointment.end_time}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center shrink-0">
          {/* Quick status menu */}
          {onStatusChange && appointment.status !== "atendido" && appointment.status !== "cancelado" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    appointment.status === "agendado" && "bg-primary",
                    appointment.status === "confirmado" && "bg-emerald-500",
                    appointment.status === "em_atendimento" && "bg-amber-500",
                  )} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {STATUS_OPTIONS.filter((s) => s.value !== appointment.status).map((s) => (
                  <DropdownMenuItem
                    key={s.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (s.value === "atendido") {
                        onConclude?.();
                      } else {
                        onStatusChange(s.value);
                      }
                    }}
                    className={s.color}
                  >
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onWhatsApp && (
            <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onWhatsApp(); }} className="h-6 w-6 text-success">
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { SLOT_HEIGHT, timeToMinutes };
