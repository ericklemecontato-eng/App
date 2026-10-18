from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Zelador Pro API")


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")


# ===== Helpers =====
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ===== Models =====
class Condominium(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str = "Meu Condomínio"
    floors_count: int = 14
    key_overdue_hours: int = 24


class ChecklistItem(BaseModel):
    id: str = Field(default_factory=new_id)
    category: str  # iluminacao, hidraulica, limpeza, portas, seguranca, outros
    title: str
    status: Literal["pendente", "concluido", "problema", "nao_se_aplica"] = "pendente"
    quantity: int = 0  # for burned lamps
    location: Optional[str] = None
    description: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    resolved: bool = False
    updated_at: str = Field(default_factory=now_iso)


class FloorInspection(BaseModel):
    id: str = Field(default_factory=new_id)
    floor_number: int
    inspector_name: Optional[str] = None
    date: str = Field(default_factory=now_iso)
    observations: Optional[str] = None
    items: List[ChecklistItem] = Field(default_factory=list)
    photos: List[str] = Field(default_factory=list)


class Floor(BaseModel):
    id: str = Field(default_factory=new_id)
    number: int
    last_inspection_date: Optional[str] = None
    last_inspector: Optional[str] = None
    status: Literal["sem_pendencias", "com_pendencias", "nao_inspecionado"] = "nao_inspecionado"
    active_items: List[ChecklistItem] = Field(default_factory=list)


class Occurrence(BaseModel):
    id: str = Field(default_factory=new_id)
    title: str
    description: Optional[str] = None
    datetime: str = Field(default_factory=now_iso)
    location: Optional[str] = None
    floor_number: Optional[int] = None
    category: str = "outros"  # eletrica, hidraulica, limpeza, conservacao, elevadores, piscina, seguranca, portoes, areas_comuns, outros
    priority: Literal["baixa", "media", "alta", "urgente"] = "media"
    photos: List[str] = Field(default_factory=list)
    actions: Optional[str] = None
    responsible: Optional[str] = None
    deadline: Optional[str] = None
    status: Literal["aberta", "em_andamento", "aguardando_profissional", "aguardando_material", "resolvida", "cancelada"] = "aberta"
    cancel_reason: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


class RoutineTask(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    location: Optional[str] = None
    floor_number: Optional[int] = None
    description: Optional[str] = None
    frequency: str = "diaria"  # diaria, semanal, quinzenal, mensal, pontual
    weekdays: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6])  # 0=sun..6=sat (we use 1-6 mon-sat)
    planned_time: Optional[str] = None  # HH:MM
    status: Literal["pendente", "concluida", "atrasada"] = "pendente"
    completion_date: Optional[str] = None
    observations: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    date: str  # YYYY-MM-DD
    created_at: str = Field(default_factory=now_iso)


class PoolRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    scheduled_date: str  # YYYY-MM-DD (a Saturday)
    attended: Optional[Literal["sim", "nao", "parcial", "reagendado"]] = None
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    provider_name: Optional[str] = None
    company: Optional[str] = None
    service_description: Optional[str] = None
    observations: Optional[str] = None
    photos: List[str] = Field(default_factory=list)
    checklist: Dict[str, bool] = Field(default_factory=lambda: {
        "comparecimento": False,
        "servico_realizado": False,
        "irregularidades": False,
        "necessita_retorno": False,
        "concluido": False,
    })
    status: Literal["pendente", "concluido", "falta", "reagendado"] = "pendente"
    created_at: str = Field(default_factory=now_iso)


class KeyLog(BaseModel):
    id: str = Field(default_factory=new_id)
    employee_name: str
    company: Optional[str] = None
    role: Optional[str] = None
    apartment: str
    key_identifier: str
    reason: str
    checkout_date: str = Field(default_factory=now_iso)
    checkout_handler: Optional[str] = None  # zelador que entregou
    returned: bool = False
    return_date: Optional[str] = None
    return_receiver: Optional[str] = None
    key_state: Optional[str] = None
    return_observations: Optional[str] = None
    status: Literal["em_posse", "devolvida"] = "em_posse"
    created_at: str = Field(default_factory=now_iso)
    history: List[Dict[str, Any]] = Field(default_factory=list)


# ===== Seed =====
async def seed_data():
    # Condominium
    cond = await db.condominium.find_one({}, {"_id": 0})
    if not cond:
        c = Condominium()
        await db.condominium.insert_one(c.dict())
    # 14 floors
    count = await db.floors.count_documents({})
    if count == 0:
        for i in range(1, 15):
            f = Floor(number=i)
            await db.floors.insert_one(f.dict())


# ===== Condominium =====
@api_router.get("/condominium")
async def get_condominium():
    cond = await db.condominium.find_one({}, {"_id": 0})
    if not cond:
        c = Condominium()
        await db.condominium.insert_one(c.dict())
        return c.dict()
    return cond


class CondoUpdate(BaseModel):
    name: Optional[str] = None
    key_overdue_hours: Optional[int] = None


@api_router.put("/condominium")
async def update_condominium(body: CondoUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if update:
        await db.condominium.update_one({}, {"$set": update})
    return await get_condominium()


# ===== Floors =====
@api_router.get("/floors")
async def list_floors():
    floors = await db.floors.find({}, {"_id": 0}).sort("number", 1).to_list(100)
    return floors


@api_router.get("/floors/{number}")
async def get_floor(number: int):
    floor = await db.floors.find_one({"number": number}, {"_id": 0})
    if not floor:
        raise HTTPException(404, "Andar não encontrado")
    return floor


class InspectionCreate(BaseModel):
    inspector_name: Optional[str] = None
    observations: Optional[str] = None
    items: List[ChecklistItem] = Field(default_factory=list)
    photos: List[str] = Field(default_factory=list)


@api_router.post("/floors/{number}/inspections")
async def create_inspection(number: int, body: InspectionCreate):
    floor = await db.floors.find_one({"number": number}, {"_id": 0})
    if not floor:
        raise HTTPException(404, "Andar não encontrado")
    inspection = FloorInspection(
        floor_number=number,
        inspector_name=body.inspector_name,
        observations=body.observations,
        items=body.items,
        photos=body.photos,
    )
    await db.inspections.insert_one(inspection.dict())

    # Update active_items: merge new problems
    active = floor.get("active_items", [])
    for item in body.items:
        d = item.dict() if hasattr(item, "dict") else item
        if d.get("status") == "problema" and not d.get("resolved"):
            active.append(d)

    has_pendencies = any(
        (it.get("status") == "problema" and not it.get("resolved")) for it in active
    )
    status = "com_pendencias" if has_pendencies else "sem_pendencias"

    await db.floors.update_one(
        {"number": number},
        {"$set": {
            "last_inspection_date": inspection.date,
            "last_inspector": body.inspector_name,
            "status": status,
            "active_items": active,
        }},
    )
    return inspection.dict()


@api_router.get("/floors/{number}/inspections")
async def floor_inspections(number: int):
    rows = await db.inspections.find({"floor_number": number}, {"_id": 0}).sort("date", -1).to_list(200)
    return rows


class ItemResolve(BaseModel):
    item_id: str
    resolved: bool = True


@api_router.post("/floors/{number}/resolve-item")
async def resolve_item(number: int, body: ItemResolve):
    floor = await db.floors.find_one({"number": number}, {"_id": 0})
    if not floor:
        raise HTTPException(404, "Andar não encontrado")
    active = floor.get("active_items", [])
    updated_any = False
    for it in active:
        if it.get("id") == body.item_id:
            it["resolved"] = body.resolved
            it["updated_at"] = now_iso()
            updated_any = True
    has_pendencies = any((it.get("status") == "problema" and not it.get("resolved")) for it in active)
    status = "com_pendencias" if has_pendencies else ("sem_pendencias" if floor.get("last_inspection_date") else "nao_inspecionado")
    await db.floors.update_one({"number": number}, {"$set": {"active_items": active, "status": status}})
    return {"ok": updated_any, "floor": await db.floors.find_one({"number": number}, {"_id": 0})}


# ===== Summary =====
@api_router.get("/summary")
async def summary():
    floors = await db.floors.find({}, {"_id": 0}).to_list(100)
    total_lamps = 0
    total_hidro = 0
    total_eletrica = 0
    total_limpeza = 0
    total_conservacao = 0
    total_pendencias = 0
    for f in floors:
        for it in f.get("active_items", []):
            if it.get("resolved"):
                continue
            total_pendencias += 1
            cat = it.get("category")
            if cat == "iluminacao":
                total_lamps += int(it.get("quantity") or 1)
                total_eletrica += 1
            elif cat == "hidraulica":
                total_hidro += 1
            elif cat == "limpeza":
                total_limpeza += 1
            elif cat == "seguranca":
                total_conservacao += 1

    # occurrences
    open_occ = await db.occurrences.count_documents({"status": {"$nin": ["resolvida", "cancelada"]}})
    resolved_occ = await db.occurrences.count_documents({"status": "resolvida"})

    # keys pending
    pending_keys = await db.key_logs.count_documents({"returned": False})

    # today's routine
    today = datetime.now(timezone.utc).date().isoformat()
    tasks_today = await db.routine_tasks.find({"date": today}, {"_id": 0}).to_list(500)
    tasks_done = len([t for t in tasks_today if t.get("status") == "concluida"])
    tasks_pending = len([t for t in tasks_today if t.get("status") != "concluida"])

    # overdue tasks: date < today and not completed
    overdue_count = await db.routine_tasks.count_documents({"date": {"$lt": today}, "status": {"$ne": "concluida"}})

    # pool status (nearest Saturday)
    today_dt = datetime.now(timezone.utc).date()
    # find Saturday this week
    offset = (5 - today_dt.weekday()) % 7
    saturday = (today_dt + timedelta(days=offset)).isoformat()
    pool = await db.pool_records.find_one({"scheduled_date": saturday}, {"_id": 0})

    return {
        "total_lamps": total_lamps,
        "total_hidraulica": total_hidro,
        "total_eletrica": total_eletrica,
        "total_limpeza": total_limpeza,
        "total_conservacao": total_conservacao,
        "total_pendencias": total_pendencias,
        "open_occurrences": open_occ,
        "resolved_occurrences": resolved_occ,
        "pending_keys": pending_keys,
        "tasks_today_total": len(tasks_today),
        "tasks_today_done": tasks_done,
        "tasks_today_pending": tasks_pending,
        "overdue_tasks": overdue_count,
        "pool_next_saturday": saturday,
        "pool_status": (pool.get("status") if pool else "pendente"),
    }


# ===== Occurrences =====
class OccurrenceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    floor_number: Optional[int] = None
    category: str = "outros"
    priority: Literal["baixa", "media", "alta", "urgente"] = "media"
    photos: List[str] = Field(default_factory=list)
    actions: Optional[str] = None
    responsible: Optional[str] = None
    deadline: Optional[str] = None


@api_router.post("/occurrences")
async def create_occurrence(body: OccurrenceCreate):
    o = Occurrence(**body.dict())
    await db.occurrences.insert_one(o.dict())
    return o.dict()


@api_router.get("/occurrences")
async def list_occurrences(status: Optional[str] = None, floor: Optional[int] = None, category: Optional[str] = None):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    if floor is not None:
        q["floor_number"] = floor
    if category:
        q["category"] = category
    rows = await db.occurrences.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rows


class OccurrenceUpdate(BaseModel):
    status: Optional[str] = None
    actions: Optional[str] = None
    responsible: Optional[str] = None
    deadline: Optional[str] = None
    cancel_reason: Optional[str] = None
    photos: Optional[List[str]] = None


@api_router.put("/occurrences/{occ_id}")
async def update_occurrence(occ_id: str, body: OccurrenceUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    update["updated_at"] = now_iso()
    r = await db.occurrences.update_one({"id": occ_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "Ocorrência não encontrada")
    return await db.occurrences.find_one({"id": occ_id}, {"_id": 0})


# ===== Routine =====
class RoutineCreate(BaseModel):
    name: str
    location: Optional[str] = None
    floor_number: Optional[int] = None
    description: Optional[str] = None
    frequency: str = "diaria"
    weekdays: List[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6])
    planned_time: Optional[str] = None
    date: str  # YYYY-MM-DD


@api_router.post("/routine")
async def create_task(body: RoutineCreate):
    t = RoutineTask(**body.dict())
    await db.routine_tasks.insert_one(t.dict())
    return t.dict()


@api_router.get("/routine")
async def list_tasks(date: Optional[str] = None):
    q: Dict[str, Any] = {}
    if date:
        q["date"] = date
    rows = await db.routine_tasks.find(q, {"_id": 0}).sort("date", -1).to_list(500)
    return rows


class RoutineUpdate(BaseModel):
    status: Optional[str] = None
    observations: Optional[str] = None
    photos: Optional[List[str]] = None


@api_router.put("/routine/{task_id}")
async def update_task(task_id: str, body: RoutineUpdate):
    update = {k: v for k, v in body.dict().items() if v is not None}
    if body.status == "concluida":
        update["completion_date"] = now_iso()
    r = await db.routine_tasks.update_one({"id": task_id}, {"$set": update})
    if r.matched_count == 0:
        raise HTTPException(404, "Tarefa não encontrada")
    return await db.routine_tasks.find_one({"id": task_id}, {"_id": 0})


@api_router.delete("/routine/{task_id}")
async def delete_task(task_id: str):
    await db.routine_tasks.delete_one({"id": task_id})
    return {"ok": True}


# ===== Pool =====
class PoolUpsert(BaseModel):
    scheduled_date: str
    attended: Optional[Literal["sim", "nao", "parcial", "reagendado"]] = None
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    provider_name: Optional[str] = None
    company: Optional[str] = None
    service_description: Optional[str] = None
    observations: Optional[str] = None
    photos: Optional[List[str]] = None
    checklist: Optional[Dict[str, bool]] = None
    status: Optional[Literal["pendente", "concluido", "falta", "reagendado"]] = None


@api_router.post("/pool")
async def upsert_pool(body: PoolUpsert):
    existing = await db.pool_records.find_one({"scheduled_date": body.scheduled_date}, {"_id": 0})
    if not existing:
        rec = PoolRecord(scheduled_date=body.scheduled_date)
        d = rec.dict()
        payload = body.dict(exclude_none=True)
        d.update(payload)
        await db.pool_records.insert_one(d)
        return {k: v for k, v in d.items() if k != "_id"}
    update = body.dict(exclude_none=True)
    await db.pool_records.update_one({"scheduled_date": body.scheduled_date}, {"$set": update})
    return await db.pool_records.find_one({"scheduled_date": body.scheduled_date}, {"_id": 0})


@api_router.get("/pool")
async def list_pool():
    rows = await db.pool_records.find({}, {"_id": 0}).sort("scheduled_date", -1).to_list(200)
    return rows


@api_router.get("/pool/{date}")
async def get_pool(date: str):
    rec = await db.pool_records.find_one({"scheduled_date": date}, {"_id": 0})
    if not rec:
        # create default pending
        rec = PoolRecord(scheduled_date=date).dict()
        await db.pool_records.insert_one(rec)
        rec.pop("_id", None)
    return rec


# ===== Keys =====
class KeyCheckout(BaseModel):
    employee_name: str
    company: Optional[str] = None
    role: Optional[str] = None
    apartment: str
    key_identifier: str
    reason: str
    checkout_handler: Optional[str] = None


@api_router.post("/keys/checkout")
async def key_checkout(body: KeyCheckout):
    log = KeyLog(**body.dict())
    log.history.append({"action": "retirada", "at": log.checkout_date, "by": body.checkout_handler})
    await db.key_logs.insert_one(log.dict())
    return log.dict()


class KeyReturn(BaseModel):
    return_receiver: Optional[str] = None
    key_state: Optional[str] = None
    return_observations: Optional[str] = None


@api_router.post("/keys/{key_id}/return")
async def key_return(key_id: str, body: KeyReturn):
    log = await db.key_logs.find_one({"id": key_id}, {"_id": 0})
    if not log:
        raise HTTPException(404, "Registro não encontrado")
    if log.get("returned"):
        raise HTTPException(400, "Chave já devolvida")
    now = now_iso()
    history = log.get("history", [])
    history.append({"action": "devolucao", "at": now, "to": body.return_receiver})
    update = {
        "returned": True,
        "return_date": now,
        "return_receiver": body.return_receiver,
        "key_state": body.key_state,
        "return_observations": body.return_observations,
        "status": "devolvida",
        "history": history,
    }
    await db.key_logs.update_one({"id": key_id}, {"$set": update})
    return await db.key_logs.find_one({"id": key_id}, {"_id": 0})


@api_router.get("/keys")
async def list_keys(returned: Optional[bool] = None, q: Optional[str] = None):
    query: Dict[str, Any] = {}
    if returned is not None:
        query["returned"] = returned
    rows = await db.key_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in (r.get("employee_name", "") + r.get("company", "") + r.get("apartment", "") + r.get("key_identifier", "")).lower()]
    return rows


@api_router.get("/keys/{key_id}")
async def get_key(key_id: str):
    log = await db.key_logs.find_one({"id": key_id}, {"_id": 0})
    if not log:
        raise HTTPException(404, "Registro não encontrado")
    return log


# ===== Reports =====
@api_router.get("/reports/overview")
async def report_overview(period: str = "daily"):
    now = datetime.now(timezone.utc)
    if period == "daily":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "weekly":
        start = now - timedelta(days=7)
    else:
        start = now - timedelta(days=30)
    start_iso = start.isoformat()

    occurrences = await db.occurrences.find({"created_at": {"$gte": start_iso}}, {"_id": 0}).to_list(500)
    tasks = await db.routine_tasks.find({"date": {"$gte": start.date().isoformat()}}, {"_id": 0}).to_list(500)
    keys = await db.key_logs.find({"created_at": {"$gte": start_iso}}, {"_id": 0}).to_list(500)
    pool = await db.pool_records.find({"scheduled_date": {"$gte": start.date().isoformat()}}, {"_id": 0}).to_list(200)

    summary_data = await summary()

    return {
        "period": period,
        "generated_at": now_iso(),
        "summary": summary_data,
        "occurrences": occurrences,
        "tasks": tasks,
        "keys": keys,
        "pool": pool,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_data()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
