import { useState, useRef, useCallback } from "react";
import { AgendaAppointment, SLOT_HEIGHT, timeToMinutes } from "./AgendaTimelineCard";
import { AgendaTimelineCard } from "./AgendaTimelineCard";
import { cn } from "@/lib/utils";

interface WeeklyAgendaGridProps {
  weekDates: Date[];
  appointmentsByDate: Record<string, AgendaAppointment[]>;
  startHour?: number;
  endHour?: number;
  onWhatsApp?: (phone: string, name: string) => void;
  onConclude?: (id: string) => void;
  onManage?: (apt: AgendaAppointment) => void;
  onStatusChange?: (id: string, status: string) => void;
  onSlotClick?: (date: Date, time: string) => void;
  onDragEnd?: (id: string, newStartTime: string, newEndTime: string) => void;
}

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface LayoutInfo {
  column: number;
  totalColumns: number;
}

function computeOverlapLayout(appointments: AgendaAppointment[]): Map<string, LayoutInfo> {
  const layout = new Map<string, LayoutInfo>();
  if (appointments.length === 0) return layout;
  const sorted = [...appointments].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
  const groups: AgendaAppointment[][] = [];
  let currentGroup: AgendaAppointment[] = [sorted[0]];
  let groupEnd = timeToMinutes(sorted[0].end_time);
  for (let i = 1; i < sorted.length; i++) {
    const apt = sorted[i];
    const aptStart = timeToMinutes(apt.start_time);
    if (aptStart < groupEnd) {
      currentGroup.push(apt);
      groupEnd = Math.max(groupEnd, timeToMinutes(apt.end_time));
    } else {
      groups.push(currentGroup);
      currentGroup = [apt];
      groupEnd = timeToMinutes(apt.end_time);
    }
  }
  groups.push(currentGroup);
  for (const group of groups) {
    const totalColumns = group.length;
    group.forEach((apt, idx) => {
      layout.set(apt.id, { column: idx, totalColumns });
    });
  }
  return layout;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function WeeklyAgendaGrid({
  weekDates,
  appointmentsByDate,
  startHour = 7,
  endHour = 21,
  onWhatsApp,
  onConclude,
  onManage,
  onStatusChange,
  onSlotClick,
  onDragEnd,
}: WeeklyAgendaGridProps) {
  const totalSlots = (endHour - startHour) * 2;
  const slots: string[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const hour = startHour + Math.floor(i / 2);
    const min = i % 2 === 0 ? "00" : "30";
    slots.push(`${hour.toString().padStart(2, "0")}:${min}`);
  }

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const TIME_COL_WIDTH = 48;

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartY = useRef(0);
  const dragAptRef = useRef<AgendaAppointment | null>(null);

  const snapToSlot = useCallback((offsetY: number, apt: AgendaAppointment) => {
    const startMin = timeToMinutes(apt.start_time);
    const endMin = timeToMinutes(apt.end_time);
    const duration = endMin - startMin;
    const minutesMoved = (offsetY / SLOT_HEIGHT) * 30;
    const snappedMinutes = Math.round(minutesMoved / 15) * 15;
    const newStart = startMin + snappedMinutes;
    const newEnd = newStart + duration;
    const minAllowed = startHour * 60;
    const maxAllowed = endHour * 60;
    if (newStart < minAllowed || newEnd > maxAllowed) return null;
    return { start: minutesToTime(newStart), end: minutesToTime(newEnd) };
  }, [startHour, endHour]);

  const handleDragStart = useCallback((apt: AgendaAppointment) => (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDraggingId(apt.id);
    dragAptRef.current = apt;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;

    const handleMove = (ev: MouseEvent | TouchEvent) => {
      const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      setDragOffsetY(cy - dragStartY.current);
    };

    const handleUp = (ev: MouseEvent | TouchEvent) => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleUp);
      const cy = "changedTouches" in ev ? ev.changedTouches[0].clientY : ev.clientY;
      const dy = cy - dragStartY.current;
      if (Math.abs(dy) > 10 && dragAptRef.current) {
        const result = snapToSlot(dy, dragAptRef.current);
        if (result && onDragEnd) onDragEnd(dragAptRef.current.id, result.start, result.end);
      }
      setDraggingId(null);
      setDragOffsetY(0);
      dragAptRef.current = null;
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleUp);
  }, [snapToSlot, onDragEnd]);

  return (
    <div className="flex flex-col">
      {/* Header row with day names */}
      <div className="flex border-b border-border/30 sticky top-0 z-20 bg-background">
        <div className="shrink-0" style={{ width: TIME_COL_WIDTH }} />
        {weekDates.map((date, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 text-center py-2 border-l border-border/20",
              isToday(date) && "bg-primary/10"
            )}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{WEEKDAY_LABELS[date.getDay()]}</div>
            <div className={cn(
              "text-sm font-bold leading-tight",
              isToday(date) ? "text-primary" : "text-foreground"
            )}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="relative flex" style={{ height: `${totalSlots * SLOT_HEIGHT}px` }}>
        {/* Time labels column */}
        <div className="shrink-0 relative" style={{ width: TIME_COL_WIDTH }}>
          {slots.map((time, i) => (
            <div
              key={time}
              className="absolute right-0 left-0 flex items-start justify-end pr-2"
              style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
            >
              {i % 2 === 0 && (
                <span className="text-[10px] text-muted-foreground/50 leading-none -mt-0.5">{time}</span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, dayIdx) => {
          const dateKey = date.toISOString().split("T")[0];
          const dayAppointments = appointmentsByDate[dateKey] || [];
          const overlapLayout = computeOverlapLayout(dayAppointments);

          return (
            <div
              key={dayIdx}
              className={cn(
                "flex-1 relative border-l border-border/20",
                isToday(date) && "bg-primary/[0.03]"
              )}
            >
              {/* Slot backgrounds / click targets */}
              {slots.map((time, i) => (
                <div
                  key={time}
                  className={cn(
                    "absolute left-0 right-0 border-t cursor-pointer transition-colors",
                    i % 2 === 0 ? "border-border/20" : "border-border/10",
                    "hover:bg-primary/5"
                  )}
                  style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
                  onClick={() => onSlotClick?.(date, time)}
                />
              ))}

              {/* Appointment cards */}
              {dayAppointments.map((apt) => {
                const layoutInfo = overlapLayout.get(apt.id);
                const startMin = timeToMinutes(apt.start_time);
                const endMin = timeToMinutes(apt.end_time);
                const duration = endMin - startMin;
                const topOffset = ((startMin - startHour * 60) / 30) * SLOT_HEIGHT + (draggingId === apt.id ? dragOffsetY : 0);
                const height = Math.max((duration / 30) * SLOT_HEIGHT - 2, 20);

                const col = layoutInfo?.column ?? 0;
                const totalCols = layoutInfo?.totalColumns ?? 1;

                const statusStyles: Record<string, string> = {
                  agendado: "bg-primary/20 border-primary/40",
                  confirmado: "bg-emerald-500/20 border-emerald-500/40",
                  em_atendimento: "bg-amber-500/25 border-amber-500/50",
                  atendido: "bg-success/15 border-success/30 opacity-60",
                  cancelado: "bg-muted/50 border-border opacity-40",
                  faltou: "bg-destructive/20 border-destructive/40 opacity-50",
                };

                const cardStyle = apt.is_encaixe
                  ? "bg-warning/25 border-warning/50 border-dashed border-2"
                  : statusStyles[apt.status] || "bg-primary/20 border-primary/40";

                const leftPercent = (col / totalCols) * 100;
                const widthPercent = (1 / totalCols) * 100;

                return (
                  <div
                    key={apt.id}
                    className={cn(
                      "absolute rounded-sm px-1 py-0.5 border overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/40 select-none z-10",
                      cardStyle,
                      draggingId === apt.id && "ring-2 ring-primary shadow-xl z-50 opacity-90"
                    )}
                    style={{
                      top: `${topOffset}px`,
                      height: `${height}px`,
                      left: `${leftPercent + 1}%`,
                      width: `${widthPercent - 2}%`,
                      transition: draggingId === apt.id ? "none" : "top 0.2s ease",
                    }}
                    onClick={() => {
                      if (draggingId) return;
                      onManage?.(apt);
                    }}
                  >
                    {/* Drag handle area - top of card */}
                    {onDragEnd && (
                      <div
                        className="absolute top-0 left-0 right-0 h-3 cursor-grab active:cursor-grabbing touch-none"
                        onMouseDown={(e) => { e.stopPropagation(); handleDragStart(apt)(e); }}
                        onTouchStart={(e) => { e.stopPropagation(); handleDragStart(apt)(e); }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div className="flex flex-col min-w-0 h-full justify-center">
                      <span className="font-semibold text-[10px] leading-tight truncate">{apt.client_name}</span>
                      {height > 24 && (
                        <span className="text-[9px] leading-tight text-muted-foreground truncate">
                          {apt.service_name}
                        </span>
                      )}
                      {height > 36 && (
                        <span className="text-[9px] leading-tight text-muted-foreground/70 truncate">
                          {apt.start_time}-{apt.end_time}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
