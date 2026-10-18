// Todos os dados ficam salvos no próprio celular (sem servidor).
export { api } from "./localdb";

export type ChecklistItem = {
  id: string;
  category: string;
  title: string;
  status: "pendente" | "concluido" | "problema" | "nao_se_aplica";
  quantity: number;
  location?: string | null;
  description?: string | null;
  photos: string[];
  resolved: boolean;
  updated_at: string;
};

export type Floor = {
  id: string;
  number: int;
  last_inspection_date?: string | null;
  last_inspector?: string | null;
  status: "sem_pendencias" | "com_pendencias" | "nao_inspecionado";
  active_items: ChecklistItem[];
};

type int = number;

export type Occurrence = {
  id: string;
  title: string;
  description?: string;
  datetime: string;
  location?: string;
  floor_number?: number;
  category: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  photos: string[];
  actions?: string;
  responsible?: string;
  deadline?: string;
  status: "aberta" | "em_andamento" | "aguardando_profissional" | "aguardando_material" | "resolvida" | "cancelada";
  cancel_reason?: string;
  created_at: string;
  updated_at: string;
};

export type RoutineTask = {
  id: string;
  name: string;
  location?: string;
  floor_number?: number;
  description?: string;
  frequency: string;
  weekdays: number[];
  planned_time?: string;
  status: "pendente" | "concluida" | "atrasada";
  completion_date?: string;
  observations?: string;
  photos: string[];
  date: string;
  created_at: string;
};

export type KeyLog = {
  id: string;
  employee_name: string;
  company?: string;
  role?: string;
  apartment: string;
  key_identifier: string;
  reason: string;
  checkout_date: string;
  checkout_handler?: string;
  returned: boolean;
  return_date?: string;
  return_receiver?: string;
  key_state?: string;
  return_observations?: string;
  status: "em_posse" | "devolvida";
  created_at: string;
  history: { action: string; at: string; by?: string; to?: string }[];
};

export type PoolRecord = {
  id: string;
  scheduled_date: string;
  attended?: "sim" | "nao" | "parcial" | "reagendado" | null;
  arrival_time?: string;
  departure_time?: string;
  provider_name?: string;
  company?: string;
  service_description?: string;
  observations?: string;
  photos: string[];
  checklist: Record<string, boolean>;
  status: "pendente" | "concluido" | "falta" | "reagendado";
};

export type Summary = {
  total_lamps: number;
  total_hidraulica: number;
  total_eletrica: number;
  total_limpeza: number;
  total_conservacao: number;
  total_pendencias: number;
  open_occurrences: number;
  resolved_occurrences: number;
  pending_keys: number;
  tasks_today_total: number;
  tasks_today_done: number;
  tasks_today_pending: number;
  overdue_tasks: number;
  pool_next_saturday: string;
  pool_status: string;
};
