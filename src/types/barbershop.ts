export type AppointmentStatus = 'agendado' | 'confirmado' | 'atendido' | 'faltou' | 'cancelado';

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito';

export interface Barber {
  id: string;
  name: string;
  commission_percent: number;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  commission_percent: number;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  notes?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  client?: Client;
  service_id: string;
  service?: Service;
  barber_id: string;
  barber?: Barber;
  date: string;
  time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: string;
  barberia_id: string;
  name: string;
  price: number;
  stock: number | null;
  active: boolean;
  created_at: string;
}

export interface AppointmentProduct {
  id: string;
  appointment_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  appointment_id: string;
  appointment?: Appointment;
  amount: number;
  products_amount: number;
  payment_method: PaymentMethod;
  barber_commission: number;
  created_at: string;
}

export interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  topBarber: { name: string; count: number } | null;
  pendingConfirmations: number;
}
