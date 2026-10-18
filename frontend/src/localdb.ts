// Banco de dados local (no próprio celular). Imita a API antiga (api.get/post/put/delete)
// para que as telas continuem iguais, mas tudo fica salvo no aparelho, sem servidor.
import { storage } from "@/src/utils/storage";

type DB = {
  condominium: any;
  floors: any[];
  inspections: any[];
  occurrences: any[];
  routine_tasks: any[];
  pool_records: any[];
  key_logs: any[];
};

const DB_KEY = "zelador_db_v1";
let cache: DB | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();
const localDate = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function emptyDB(): DB {
  return {
    condominium: { id: newId(), name: "Meu Condomínio", floors_count: 14, key_overdue_hours: 24 },
    floors: Array.from({ length: 14 }, (_, i) => ({
      id: newId(),
      number: i + 1,
      last_inspection_date: null,
      last_inspector: null,
      status: "nao_inspecionado",
      active_items: [],
    })),
    inspections: [],
    occurrences: [],
    routine_tasks: [],
    pool_records: [],
    key_logs: [],
  };
}

async function load(): Promise<DB> {
  if (cache) return cache;
  const raw = await storage.getItem<string | null>(DB_KEY, null);
  if (typeof raw === "string") {
    try {
      cache = { ...emptyDB(), ...JSON.parse(raw) } as DB;
      return cache;
    } catch {
      // dados corrompidos: recomeça
    }
  }
  cache = emptyDB();
  await persist();
  return cache;
}

function persist() {
  writeChain = writeChain.then(() => storage.setItem(DB_KEY, JSON.stringify(cache)));
  return writeChain;
}

function fail(status: number, detail: string): never {
  // Mesmo formato de erro do axios, usado nas telas (e.response.data.detail)
  throw { response: { status, data: { detail } } };
}

function floorStatus(floor: any) {
  const pend = (floor.active_items ?? []).some((it: any) => it.status === "problema" && !it.resolved);
  if (pend) return "com_pendencias";
  return floor.last_inspection_date ? "sem_pendencias" : "nao_inspecionado";
}

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  return localDate(d);
}

function defaultPool(date: string) {
  return {
    id: newId(),
    scheduled_date: date,
    attended: null,
    arrival_time: null,
    departure_time: null,
    provider_name: null,
    company: null,
    service_description: null,
    observations: null,
    photos: [],
    checklist: {
      comparecimento: false,
      servico_realizado: false,
      irregularidades: false,
      necessita_retorno: false,
      concluido: false,
    },
    status: "pendente",
    created_at: nowIso(),
  };
}

const stripNulls = (o: Record<string, any>) =>
  Object.fromEntries(Object.entries(o ?? {}).filter(([, v]) => v !== null && v !== undefined));

function summary(db: DB) {
  let lamps = 0, hidro = 0, ele = 0, limp = 0, cons = 0, pend = 0;
  for (const f of db.floors) {
    for (const it of f.active_items ?? []) {
      if (it.resolved || it.status !== "problema") continue;
      pend += 1;
      if (it.category === "iluminacao") {
        lamps += Number(it.quantity) || 1;
        ele += 1;
      } else if (it.category === "hidraulica") hidro += 1;
      else if (it.category === "limpeza") limp += 1;
      else if (it.category === "seguranca") cons += 1;
    }
  }
  const today = localDate();
  const tasksToday = db.routine_tasks.filter((t) => t.date === today);
  const sat = nextSaturday();
  const pool = db.pool_records.find((p) => p.scheduled_date === sat);
  return {
    total_lamps: lamps,
    total_hidraulica: hidro,
    total_eletrica: ele,
    total_limpeza: limp,
    total_conservacao: cons,
    total_pendencias: pend,
    open_occurrences: db.occurrences.filter((o) => !["resolvida", "cancelada"].includes(o.status)).length,
    resolved_occurrences: db.occurrences.filter((o) => o.status === "resolvida").length,
    pending_keys: db.key_logs.filter((k) => !k.returned).length,
    tasks_today_total: tasksToday.length,
    tasks_today_done: tasksToday.filter((t) => t.status === "concluida").length,
    tasks_today_pending: tasksToday.filter((t) => t.status !== "concluida").length,
    overdue_tasks: db.routine_tasks.filter((t) => t.date < today && t.status !== "concluida").length,
    pool_next_saturday: sat,
    pool_status: pool?.status ?? "pendente",
  };
}

const byDesc = (key: string) => (a: any, b: any) => String(b[key] ?? "").localeCompare(String(a[key] ?? ""));

async function handle(method: string, url: string, body: any = {}): Promise<any> {
  const db = await load();
  const [pathPart, queryPart] = url.split("?");
  const query = new URLSearchParams(queryPart ?? "");
  const p = pathPart.replace(/^\/+|\/+$/g, "").split("/");
  const route = `${method} ${p[0]}`;
  let m: RegExpMatchArray | null;

  // ----- Condomínio / resumo -----
  if (method === "GET" && pathPart === "/condominium") return db.condominium;
  if (method === "PUT" && pathPart === "/condominium") {
    Object.assign(db.condominium, stripNulls(body));
    await persist();
    return db.condominium;
  }
  if (method === "GET" && pathPart === "/summary") return summary(db);

  // ----- Andares -----
  if (method === "GET" && pathPart === "/floors") return [...db.floors].sort((a, b) => a.number - b.number);
  if ((m = pathPart.match(/^\/floors\/(\d+)(\/.*)?$/))) {
    const floor = db.floors.find((f) => f.number === Number(m![1]));
    if (!floor) fail(404, "Andar não encontrado");
    const sub = m[2];
    if (method === "GET" && !sub) return floor;
    if (method === "GET" && sub === "/inspections")
      return db.inspections.filter((i) => i.floor_number === floor.number).sort(byDesc("date"));
    if (method === "POST" && sub === "/inspections") {
      const inspection = {
        id: newId(),
        floor_number: floor.number,
        inspector_name: body.inspector_name ?? null,
        date: nowIso(),
        observations: body.observations ?? null,
        items: body.items ?? [],
        photos: body.photos ?? [],
      };
      db.inspections.push(inspection);
      for (const it of inspection.items) {
        if (it.status === "problema" && !it.resolved) floor.active_items.push(it);
      }
      floor.last_inspection_date = inspection.date;
      floor.last_inspector = body.inspector_name ?? null;
      floor.status = floorStatus(floor);
      await persist();
      return inspection;
    }
    if (method === "POST" && sub === "/resolve-item") {
      let ok = false;
      for (const it of floor.active_items) {
        if (it.id === body.item_id) {
          it.resolved = body.resolved ?? true;
          it.updated_at = nowIso();
          ok = true;
        }
      }
      floor.status = floorStatus(floor);
      await persist();
      return { ok, floor };
    }
  }

  // ----- Ocorrências -----
  if (route === "GET occurrences" && p.length === 1) {
    return db.occurrences
      .filter((o) => !query.get("status") || o.status === query.get("status"))
      .sort(byDesc("created_at"));
  }
  if (route === "POST occurrences") {
    const o = {
      id: newId(),
      title: body.title,
      description: body.description ?? null,
      datetime: nowIso(),
      location: body.location ?? null,
      floor_number: body.floor_number ?? null,
      category: body.category ?? "outros",
      priority: body.priority ?? "media",
      photos: body.photos ?? [],
      actions: body.actions ?? null,
      responsible: body.responsible ?? null,
      deadline: body.deadline ?? null,
      status: "aberta",
      cancel_reason: null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.occurrences.push(o);
    await persist();
    return o;
  }
  if (route === "PUT occurrences" && p[1]) {
    const o = db.occurrences.find((x) => x.id === p[1]);
    if (!o) fail(404, "Ocorrência não encontrada");
    Object.assign(o, stripNulls(body), { updated_at: nowIso() });
    await persist();
    return o;
  }

  // ----- Rotina -----
  if (route === "GET routine") {
    const date = query.get("date");
    return db.routine_tasks.filter((t) => !date || t.date === date).sort(byDesc("date"));
  }
  if (route === "POST routine") {
    const t = {
      id: newId(),
      name: body.name,
      location: body.location || null,
      floor_number: body.floor_number ?? null,
      description: body.description || null,
      frequency: body.frequency ?? "diaria",
      weekdays: body.weekdays ?? [1, 2, 3, 4, 5, 6],
      planned_time: body.planned_time || null,
      status: "pendente",
      completion_date: null,
      observations: null,
      photos: [],
      date: body.date ?? localDate(),
      created_at: nowIso(),
    };
    db.routine_tasks.push(t);
    await persist();
    return t;
  }
  if (route === "PUT routine" && p[1]) {
    const t = db.routine_tasks.find((x) => x.id === p[1]);
    if (!t) fail(404, "Tarefa não encontrada");
    Object.assign(t, stripNulls(body));
    if (body.status === "concluida") t.completion_date = nowIso();
    await persist();
    return t;
  }
  if (route === "DELETE routine" && p[1]) {
    db.routine_tasks = db.routine_tasks.filter((x) => x.id !== p[1]);
    await persist();
    return { ok: true };
  }

  // ----- Piscina -----
  if (route === "GET pool" && !p[1]) return [...db.pool_records].sort(byDesc("scheduled_date"));
  if (route === "GET pool" && p[1]) {
    let rec = db.pool_records.find((x) => x.scheduled_date === p[1]);
    if (!rec) {
      rec = defaultPool(p[1]);
      db.pool_records.push(rec);
      await persist();
    }
    return rec;
  }
  if (route === "POST pool") {
    let rec = db.pool_records.find((x) => x.scheduled_date === body.scheduled_date);
    if (!rec) {
      rec = defaultPool(body.scheduled_date);
      db.pool_records.push(rec);
    }
    const { id: _id, ...rest } = stripNulls(body);
    Object.assign(rec, rest);
    await persist();
    return rec;
  }

  // ----- Chaves -----
  if (route === "GET keys" && !p[1]) return [...db.key_logs].sort(byDesc("created_at"));
  if (route === "GET keys" && p[1]) {
    const k = db.key_logs.find((x) => x.id === p[1]);
    if (!k) fail(404, "Registro não encontrado");
    return k;
  }
  if (route === "POST keys" && p[1] === "checkout") {
    const at = nowIso();
    const k = {
      id: newId(),
      employee_name: body.employee_name,
      company: body.company || null,
      role: body.role || null,
      apartment: body.apartment,
      key_identifier: body.key_identifier,
      reason: body.reason,
      checkout_date: at,
      checkout_handler: body.checkout_handler || null,
      returned: false,
      return_date: null,
      return_receiver: null,
      key_state: null,
      return_observations: null,
      status: "em_posse",
      created_at: at,
      history: [{ action: "retirada", at, by: body.checkout_handler || null }],
    };
    db.key_logs.push(k);
    await persist();
    return k;
  }
  if (route === "POST keys" && p[2] === "return") {
    const k = db.key_logs.find((x) => x.id === p[1]);
    if (!k) fail(404, "Registro não encontrado");
    if (k.returned) fail(400, "Chave já devolvida");
    const at = nowIso();
    Object.assign(k, {
      returned: true,
      return_date: at,
      return_receiver: body.return_receiver ?? null,
      key_state: body.key_state ?? null,
      return_observations: body.return_observations ?? null,
      status: "devolvida",
    });
    k.history.push({ action: "devolucao", at, to: body.return_receiver ?? null });
    await persist();
    return k;
  }

  // ----- Relatórios -----
  if (method === "GET" && pathPart === "/reports/overview") {
    const period = query.get("period") ?? "daily";
    const start = new Date();
    if (period === "daily") start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - (period === "weekly" ? 7 : 30));
    const startIso = start.toISOString();
    const startDate = localDate(start);
    return {
      period,
      generated_at: nowIso(),
      summary: summary(db),
      occurrences: db.occurrences.filter((o) => o.created_at >= startIso),
      tasks: db.routine_tasks.filter((t) => t.date >= startDate),
      keys: db.key_logs.filter((k) => k.created_at >= startIso),
      pool: db.pool_records.filter((x) => x.scheduled_date >= startDate),
    };
  }

  fail(404, `Rota não encontrada: ${method} ${url}`);
}

const wrap = (method: string) => async (url: string, body?: any) => ({ data: await handle(method, url, body) });

export const api = {
  get: wrap("GET"),
  post: wrap("POST"),
  put: wrap("PUT"),
  delete: wrap("DELETE"),
};
