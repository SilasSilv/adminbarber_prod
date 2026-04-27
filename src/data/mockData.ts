import { Appointment, Barber, Client, Service, Product, DashboardStats } from "@/types/barbershop";

export const mockBarbers: Barber[] = [
  { id: "1", name: "Carlos Silva", commission_percent: 50, active: true, created_at: "2024-01-01" },
  { id: "2", name: "João Santos", commission_percent: 45, active: true, created_at: "2024-01-01" },
  { id: "3", name: "Pedro Oliveira", commission_percent: 50, active: true, created_at: "2024-01-01" },
];

export const mockServices: Service[] = [
  { id: "1", name: "Corte Masculino", price: 45, duration_minutes: 30, commission_percent: 50, active: true, created_at: "2024-01-01" },
  { id: "2", name: "Barba", price: 30, duration_minutes: 20, commission_percent: 50, active: true, created_at: "2024-01-01" },
  { id: "3", name: "Corte + Barba", price: 65, duration_minutes: 45, commission_percent: 50, active: true, created_at: "2024-01-01" },
  { id: "4", name: "Pigmentação", price: 80, duration_minutes: 40, commission_percent: 50, active: true, created_at: "2024-01-01" },
  { id: "5", name: "Hidratação", price: 35, duration_minutes: 25, commission_percent: 50, active: true, created_at: "2024-01-01" },
];

export const mockClients: Client[] = [
  { id: "1", name: "Rafael Mendes", whatsapp: "11999998888", notes: "Prefere máquina 2 nas laterais", created_at: "2024-01-01" },
  { id: "2", name: "Lucas Ferreira", whatsapp: "11988887777", notes: "", created_at: "2024-01-01" },
  { id: "3", name: "André Costa", whatsapp: "11977776666", notes: "Alérgico a alguns produtos", created_at: "2024-01-01" },
  { id: "4", name: "Marcos Souza", whatsapp: "11966665555", created_at: "2024-01-01" },
  { id: "5", name: "Thiago Lima", whatsapp: "11955554444", created_at: "2024-01-01" },
];

export const mockAppointments: Appointment[] = [
  {
    id: "1",
    client_id: "1",
    client: mockClients[0],
    service_id: "3",
    service: mockServices[2],
    barber_id: "1",
    barber: mockBarbers[0],
    date: new Date().toISOString().split('T')[0],
    time: "09:00",
    duration_minutes: 45,
    status: "confirmado",
    created_at: "2024-01-01",
  },
  {
    id: "2",
    client_id: "2",
    client: mockClients[1],
    service_id: "1",
    service: mockServices[0],
    barber_id: "2",
    barber: mockBarbers[1],
    date: new Date().toISOString().split('T')[0],
    time: "10:00",
    duration_minutes: 30,
    status: "agendado",
    created_at: "2024-01-01",
  },
  {
    id: "3",
    client_id: "3",
    client: mockClients[2],
    service_id: "2",
    service: mockServices[1],
    barber_id: "1",
    barber: mockBarbers[0],
    date: new Date().toISOString().split('T')[0],
    time: "11:00",
    duration_minutes: 20,
    status: "agendado",
    created_at: "2024-01-01",
  },
  {
    id: "4",
    client_id: "4",
    client: mockClients[3],
    service_id: "3",
    service: mockServices[2],
    barber_id: "3",
    barber: mockBarbers[2],
    date: new Date().toISOString().split('T')[0],
    time: "14:00",
    duration_minutes: 45,
    status: "confirmado",
    created_at: "2024-01-01",
  },
  {
    id: "5",
    client_id: "5",
    client: mockClients[4],
    service_id: "1",
    service: mockServices[0],
    barber_id: "2",
    barber: mockBarbers[1],
    date: new Date().toISOString().split('T')[0],
    time: "15:30",
    duration_minutes: 30,
    status: "agendado",
    created_at: "2024-01-01",
  },
];

export const mockProducts: Product[] = [
  { id: "p1", barberia_id: "b1", name: "Coca-Cola", price: 6.00, stock: 24, active: true, created_at: "2024-01-01" },
  { id: "p2", barberia_id: "b1", name: "Guaraná", price: 5.00, stock: 20, active: true, created_at: "2024-01-01" },
  { id: "p3", barberia_id: "b1", name: "Heineken", price: 12.00, stock: 12, active: true, created_at: "2024-01-01" },
  { id: "p4", barberia_id: "b1", name: "Antarctica", price: 8.00, stock: 18, active: true, created_at: "2024-01-01" },
  { id: "p5", barberia_id: "b1", name: "Água", price: 3.00, stock: 30, active: true, created_at: "2024-01-01" },
  { id: "p6", barberia_id: "b1", name: "KitKat", price: 5.50, stock: 15, active: true, created_at: "2024-01-01" },
  { id: "p7", barberia_id: "b1", name: "Trident", price: 3.50, stock: 25, active: true, created_at: "2024-01-01" },
];

export const mockDashboardStats: DashboardStats = {
  todayAppointments: 8,
  todayRevenue: 420,
  topBarber: { name: "Carlos Silva", count: 4 },
  pendingConfirmations: 3,
};
