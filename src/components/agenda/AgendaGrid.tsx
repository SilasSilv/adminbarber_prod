import { useState, useRef, useCallback } from "react";
import { AgendaTimelineCard, AgendaAppointment, SLOT_HEIGHT, timeToMinutes } from "./AgendaTimelineCard";
import { cn } from "@/lib/utils";

interface AgendaGridProps {
  appointments: AgendaAppointment[];
  startHour?: number;
  endHour?: number;
  onWhatsApp?: (phone: string, name: string) => void;
  onConclude?: (id: string) => void;
  onManage?: (apt: AgendaAppointment) => void;
  onStatusChange?: (id: string, status: string) => void;
  onSlotClick?: (time: string) => void;
  onDragEnd?: (id: string, newStartTime: string, newEndTime: string) => void;
}

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

export function AgendaGrid({
  appointments,
  startHour = 8,
  endHour = 21,
  onWhatsApp,
  onConclude,
  onManage,
  onStatusChange,
  onSlotClick,
  onDragEnd,
}: AgendaGridProps) {
  const totalSlots = (endHour - startHour) * 2;
  const slots: string[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const hour = startHour + Math.floor(i / 2);
    const min = i % 2 === 0 ? "00" : "30";
    slots.push(`${hour.toString().padStart(2, "0")}:${min}`);
  }

  const overlapLayout = computeOverlapLayout(appointments);
  const gridRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const dragStartY = useRef(0);
  const dragAptRef = useRef<AgendaAppointment | null>(null);

  // Hover slot for visual feedback
  const [hoverSlotIndex, setHoverSlotIndex] = useState<number | null>(null);

  const snapToSlot = useCallback((offsetY: number, apt: AgendaAppointment) => {
    const startMin = timeToMinutes(apt.start_time);
    const endMin = timeToMinutes(apt.end_time);
    const duration = endMin - startMin;
    const minutesMoved = (offsetY / SLOT_HEIGHT) * 30;
    // Snap to 15-minute increments
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
      const dy = cy - dragStartY.current;
      setDragOffsetY(dy);
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
        if (result && onDragEnd) {
          onDragEnd(dragAptRef.current.id, result.start, result.end);
        }
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

  const handleSlotClick = (time: string) => {
    if (onSlotClick) onSlotClick(time);
  };

  return (
    <div ref={gridRef} className="relative select-none" style={{ height: `${totalSlots * SLOT_HEIGHT}px` }}>
      {/* Time slots background */}
      {slots.map((time, i) => {
        const hasAppointment = appointments.some((apt) => {
          const aptStart = timeToMinutes(apt.start_time);
          const aptEnd = timeToMinutes(apt.end_time);
          const slotMin = startHour * 60 + i * 30;
          return slotMin >= aptStart && slotMin < aptEnd;
        });

        return (
          <div
            key={time}
            className={cn(
              "absolute left-0 right-0 border-t border-border/30 flex items-start cursor-pointer transition-colors",
              onSlotClick && !hasAppointment && "hover:bg-primary/5"
            )}
            style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
            onClick={() => handleSlotClick(time)}
          >
            <span className="text-[11px] text-muted-foreground/60 w-14 text-right pr-2 shrink-0 leading-none">
              {i % 2 === 0 ? time : ""}
            </span>
            {i % 2 === 0 && (
              <div className="flex-1 border-t border-border/10 mt-1.5" />
            )}
          </div>
        );
      })}

      {/* Appointment cards */}
      {appointments.map((apt) => {
        const layoutInfo = overlapLayout.get(apt.id);
        return (
          <AgendaTimelineCard
            key={apt.id}
            appointment={apt}
            startHour={startHour}
            column={layoutInfo?.column ?? 0}
            totalColumns={layoutInfo?.totalColumns ?? 1}
            onWhatsApp={onWhatsApp ? () => onWhatsApp(apt.client_phone, apt.client_name) : undefined}
            onConclude={onConclude ? () => onConclude(apt.id) : undefined}
            onManage={onManage ? () => onManage(apt) : undefined}
            onStatusChange={onStatusChange ? (status) => onStatusChange(apt.id, status) : undefined}
            onDragStart={onDragEnd ? handleDragStart(apt) : undefined}
            isDragging={draggingId === apt.id}
            dragOffsetY={draggingId === apt.id ? dragOffsetY : 0}
          />
        );
      })}

      {/* Empty state */}
      {appointments.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhum agendamento para este dia</p>
        </div>
      )}
    </div>
  );
}
