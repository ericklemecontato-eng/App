export const CATEGORIES = [
  { id: "iluminacao", label: "Iluminação" },
  { id: "hidraulica", label: "Hidráulica" },
  { id: "limpeza", label: "Limpeza e conservação" },
  { id: "portas", label: "Portas e acessos" },
  { id: "seguranca", label: "Segurança e conservação" },
  { id: "outros", label: "Outros serviços" },
];

export const DEFAULT_CHECKLIST: { category: string; title: string }[] = [
  // Iluminação
  { category: "iluminacao", title: "Verificar lâmpadas do andar" },
  { category: "iluminacao", title: "Registrar lâmpadas queimadas" },
  { category: "iluminacao", title: "Iluminação de corredores e halls" },
  { category: "iluminacao", title: "Interruptores e sensores aparentes" },
  // Hidráulica
  { category: "hidraulica", title: "Sinais aparentes de vazamento" },
  { category: "hidraulica", title: "Manchas de umidade ou infiltração" },
  { category: "hidraulica", title: "Torneiras/registros de áreas comuns" },
  // Limpeza
  { category: "limpeza", title: "Limpeza do hall" },
  { category: "limpeza", title: "Limpeza dos corredores" },
  { category: "limpeza", title: "Odores ou sujeira fora do padrão" },
  { category: "limpeza", title: "Danos em paredes, tetos e pisos" },
  // Portas
  { category: "portas", title: "Portas das áreas comuns" },
  { category: "portas", title: "Fechaduras e maçanetas" },
  { category: "portas", title: "Rotas de fuga desobstruídas" },
  { category: "portas", title: "Portas corta-fogo (inspeção visual)" },
  // Segurança
  { category: "seguranca", title: "Extintores/hidrantes acessíveis" },
  { category: "seguranca", title: "Placas de sinalização" },
  { category: "seguranca", title: "Iluminação de emergência" },
  { category: "seguranca", title: "Trincas/infiltrações aparentes" },
];

export const PRIORITIES = [
  { id: "baixa", label: "Baixa" },
  { id: "media", label: "Média" },
  { id: "alta", label: "Alta" },
  { id: "urgente", label: "Urgente" },
];

export const OCCURRENCE_CATEGORIES = [
  { id: "eletrica", label: "Elétrica" },
  { id: "hidraulica", label: "Hidráulica" },
  { id: "limpeza", label: "Limpeza" },
  { id: "conservacao", label: "Conservação" },
  { id: "elevadores", label: "Elevadores" },
  { id: "piscina", label: "Piscina" },
  { id: "seguranca", label: "Segurança" },
  { id: "portoes", label: "Portões e acessos" },
  { id: "areas_comuns", label: "Áreas comuns" },
  { id: "outros", label: "Outros" },
];

export const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  problema: "Problema",
  nao_se_aplica: "N/A",
  concluida: "Concluída",
  atrasada: "Atrasada",
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_profissional: "Aguardando profissional",
  aguardando_material: "Aguardando material",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
  em_posse: "Em posse",
  devolvida: "Devolvida",
  sem_pendencias: "Sem pendências",
  com_pendencias: "Com pendências",
  nao_inspecionado: "Não inspecionado",
};

export const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const WEEKDAYS_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatDatePt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}

export function formatDateTimePt(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return iso;
  }
}

export function nextSaturdayISO(): string {
  const d = new Date();
  const offset = (6 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function hoursBetween(iso1: string, iso2: string = new Date().toISOString()): number {
  return Math.floor((new Date(iso2).getTime() - new Date(iso1).getTime()) / 3600000);
}
