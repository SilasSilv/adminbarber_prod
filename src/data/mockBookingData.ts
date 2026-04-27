export interface BookingBarbershop {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
}

export interface BookingService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export interface BookingBarber {
  id: string;
  name: string;
}

export interface BookingAppointment {
  id: string;
  barber_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
}

const today = new Date().toISOString().split("T")[0];

export const mockBarbershops: BookingBarbershop[] = [
  {
    id: "1",
    name: "Barbearia do João",
    slug: "barbearia-do-joao",
    phone: "11999990000",
    address: "Rua das Flores, 123 - Centro",
  },
  {
    id: "2",
    name: "BarberKing",
    slug: "barberking",
    phone: "11988880000",
    address: "Av. Paulista, 500 - São Paulo",
  },
];

export const mockBookingServices: Record<string, BookingService[]> = {
  "1": [
    { id: "s1", name: "Corte Masculino", price: 45, duration_minutes: 30 },
    { id: "s2", name: "Barba", price: 30, duration_minutes: 20 },
    { id: "s3", name: "Corte + Barba", price: 65, duration_minutes: 45 },
    { id: "s4", name: "Pigmentação", price: 80, duration_minutes: 40 },
    { id: "s5", name: "Hidratação", price: 35, duration_minutes: 25 },
  ],
  "2": [
    { id: "s6", name: "Corte Premium", price: 55, duration_minutes: 40 },
    { id: "s7", name: "Barba Completa", price: 35, duration_minutes: 25 },
    { id: "s8", name: "Combo King", price: 80, duration_minutes: 60 },
  ],
};

export const mockBookingBarbers: Record<string, BookingBarber[]> = {
  "1": [
    { id: "b1", name: "Carlos Silva" },
    { id: "b2", name: "João Santos" },
    { id: "b3", name: "Pedro Oliveira" },
  ],
  "2": [
    { id: "b4", name: "Marcos Lima" },
    { id: "b5", name: "Felipe Costa" },
  ],
};

export const mockBookingAppointments: BookingAppointment[] = [
  { id: "a1", barber_id: "b1", date: today, time: "09:00", duration_minutes: 30, status: "agendado" },
  { id: "a2", barber_id: "b1", date: today, time: "10:00", duration_minutes: 45, status: "confirmado" },
  { id: "a3", barber_id: "b2", date: today, time: "09:30", duration_minutes: 30, status: "agendado" },
  { id: "a4", barber_id: "b2", date: today, time: "14:00", duration_minutes: 45, status: "confirmado" },
  { id: "a5", barber_id: "b3", date: today, time: "11:00", duration_minutes: 30, status: "agendado" },
  { id: "a6", barber_id: "b1", date: today, time: "15:00", duration_minutes: 30, status: "cancelado" },
];

export function findBarbershopBySlug(slug: string) {
  return mockBarbershops.find((b) => b.slug === slug) || null;
}

export function getServicesForBarbershop(barbershopId: string) {
  return mockBookingServices[barbershopId] || [];
}

export function getBarbersForBarbershop(barbershopId: string) {
  return mockBookingBarbers[barbershopId] || [];
}

export function getOccupiedSlots(barberId: string, date: string) {
  return mockBookingAppointments
    .filter((a) => a.barber_id === barberId && a.date === date && a.status !== "cancelado")
    .map((a) => ({ time: a.time, duration: a.duration_minutes }));
}

export function generateTimeSlots(durationMinutes: number, occupiedSlots: { time: string; duration: number }[]) {
  const startHour = 8;
  const endHour = 18;
  const slots: string[] = [];

  for (let minutes = startHour * 60; minutes + durationMinutes <= endHour * 60; minutes += durationMinutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    const isOccupied = occupiedSlots.some((occ) => {
      const occStart = parseInt(occ.time.split(":")[0]) * 60 + parseInt(occ.time.split(":")[1]);
      const occEnd = occStart + occ.duration;
      const slotStart = minutes;
      const slotEnd = minutes + durationMinutes;
      return slotStart < occEnd && slotEnd > occStart;
    });

    if (!isOccupied) {
      slots.push(timeStr);
    }
  }

  return slots;
}

let localAppointments = [...mockBookingAppointments];

export function addBookingAppointment(appointment: BookingAppointment) {
  localAppointments.push(appointment);
  mockBookingAppointments.push(appointment);
}

export function isSlotStillAvailable(barberId: string, date: string, time: string, durationMinutes: number) {
  const occupied = localAppointments
    .filter((a) => a.barber_id === barberId && a.date === date && a.status !== "cancelado");

  const slotStart = parseInt(time.split(":")[0]) * 60 + parseInt(time.split(":")[1]);
  const slotEnd = slotStart + durationMinutes;

  return !occupied.some((occ) => {
    const occStart = parseInt(occ.time.split(":")[0]) * 60 + parseInt(occ.time.split(":")[1]);
    const occEnd = occStart + occ.duration_minutes;
    return slotStart < occEnd && slotEnd > occStart;
  });
}
