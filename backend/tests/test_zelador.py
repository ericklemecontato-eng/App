"""Zelador Pro - Backend API tests"""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://zelador-pro-1.preview.emergentagent.com"
API = BASE_URL.rstrip("/") + "/api"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ===== Condominium & Floors =====
class TestCondoFloors:
    def test_condominium(self, api):
        r = api.get(f"{API}/condominium")
        assert r.status_code == 200
        data = r.json()
        assert "name" in data
        assert data.get("floors_count") == 14

    def test_floors_list_14(self, api):
        r = api.get(f"{API}/floors")
        assert r.status_code == 200
        floors = r.json()
        assert len(floors) == 14
        nums = sorted([f["number"] for f in floors])
        assert nums == list(range(1, 15))

    def test_get_floor(self, api):
        r = api.get(f"{API}/floors/5")
        assert r.status_code == 200
        assert r.json()["number"] == 5

    def test_get_floor_404(self, api):
        r = api.get(f"{API}/floors/99")
        assert r.status_code == 404


# ===== Summary =====
class TestSummary:
    def test_summary(self, api):
        r = api.get(f"{API}/summary")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_lamps", "total_pendencias", "open_occurrences", "pending_keys",
                  "tasks_today_total", "pool_next_saturday", "pool_status"]:
            assert k in d


# ===== Inspections =====
class TestInspections:
    def test_create_inspection_updates_floor_and_summary(self, api):
        before = api.get(f"{API}/summary").json()
        before_lamps = before.get("total_lamps", 0)

        payload = {
            "inspector_name": "TEST_Zelador",
            "observations": "TEST inspection",
            "items": [
                {"category": "iluminacao", "title": "TEST Lampada queimada",
                 "status": "problema", "quantity": 3},
                {"category": "hidraulica", "title": "TEST OK", "status": "concluido", "quantity": 0},
            ],
        }
        r = api.post(f"{API}/floors/7/inspections", json=payload)
        assert r.status_code == 200, r.text
        ins = r.json()
        assert ins["floor_number"] == 7

        f = api.get(f"{API}/floors/7").json()
        assert f["status"] == "com_pendencias"
        assert f["last_inspector"] == "TEST_Zelador"
        assert len(f["active_items"]) >= 1

        after = api.get(f"{API}/summary").json()
        assert after["total_lamps"] >= before_lamps + 3

    def test_resolve_item(self, api):
        # Add problem to floor 8
        payload = {
            "inspector_name": "TEST_Zelador",
            "items": [
                {"category": "iluminacao", "title": "TEST Lamp fix", "status": "problema", "quantity": 2},
            ],
        }
        api.post(f"{API}/floors/8/inspections", json=payload)
        f = api.get(f"{API}/floors/8").json()
        prob = [it for it in f["active_items"] if it.get("status") == "problema" and not it.get("resolved")]
        assert prob
        item_id = prob[0]["id"]

        r = api.post(f"{API}/floors/8/resolve-item", json={"item_id": item_id, "resolved": True})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        f2 = api.get(f"{API}/floors/8").json()
        matched = [it for it in f2["active_items"] if it["id"] == item_id]
        assert matched and matched[0]["resolved"] is True


# ===== Keys =====
class TestKeys:
    key_id = None

    def test_checkout(self, api):
        payload = {"employee_name": "TEST_John", "apartment": "101", "key_identifier": "TEST-K1",
                   "reason": "manutencao", "company": "TEST Co"}
        r = api.post(f"{API}/keys/checkout", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["employee_name"] == "TEST_John"
        assert d["returned"] is False
        assert d["status"] == "em_posse"
        TestKeys.key_id = d["id"]

    def test_list_keys(self, api):
        r = api.get(f"{API}/keys")
        assert r.status_code == 200
        assert any(k["id"] == TestKeys.key_id for k in r.json())

    def test_get_key(self, api):
        r = api.get(f"{API}/keys/{TestKeys.key_id}")
        assert r.status_code == 200
        assert r.json()["id"] == TestKeys.key_id

    def test_summary_pending_keys(self, api):
        r = api.get(f"{API}/summary")
        assert r.json()["pending_keys"] >= 1

    def test_return(self, api):
        r = api.post(f"{API}/keys/{TestKeys.key_id}/return",
                     json={"return_receiver": "TEST_Rec", "key_state": "ok"})
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "devolvida"
        assert r.json()["returned"] is True

    def test_second_return_400(self, api):
        r = api.post(f"{API}/keys/{TestKeys.key_id}/return", json={"return_receiver": "x"})
        assert r.status_code == 400


# ===== Occurrences =====
class TestOccurrences:
    occ_id = None

    def test_create(self, api):
        r = api.post(f"{API}/occurrences", json={"title": "TEST Occ", "category": "eletrica", "priority": "alta"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "TEST Occ"
        assert d["status"] == "aberta"
        TestOccurrences.occ_id = d["id"]

    def test_list(self, api):
        r = api.get(f"{API}/occurrences")
        assert r.status_code == 200
        assert any(o["id"] == TestOccurrences.occ_id for o in r.json())

    def test_update_resolve(self, api):
        r = api.put(f"{API}/occurrences/{TestOccurrences.occ_id}", json={"status": "resolvida"})
        assert r.status_code == 200
        assert r.json()["status"] == "resolvida"


# ===== Routine =====
class TestRoutine:
    task_id = None
    today = datetime.now(timezone.utc).date().isoformat()

    def test_create(self, api):
        r = api.post(f"{API}/routine", json={"name": "TEST Task", "date": TestRoutine.today, "frequency": "diaria"})
        assert r.status_code == 200, r.text
        TestRoutine.task_id = r.json()["id"]

    def test_list(self, api):
        r = api.get(f"{API}/routine", params={"date": TestRoutine.today})
        assert r.status_code == 200
        assert any(t["id"] == TestRoutine.task_id for t in r.json())

    def test_update(self, api):
        r = api.put(f"{API}/routine/{TestRoutine.task_id}", json={"status": "concluida"})
        assert r.status_code == 200
        assert r.json()["status"] == "concluida"
        assert r.json()["completion_date"]

    def test_delete(self, api):
        r = api.delete(f"{API}/routine/{TestRoutine.task_id}")
        assert r.status_code == 200


# ===== Pool =====
class TestPool:
    date = (datetime.now(timezone.utc).date() + timedelta(days=(5 - datetime.now(timezone.utc).date().weekday()) % 7)).isoformat()

    def test_get_pool_creates_default(self, api):
        r = api.get(f"{API}/pool/{TestPool.date}")
        assert r.status_code == 200
        assert r.json()["scheduled_date"] == TestPool.date

    def test_upsert_pool(self, api):
        r = api.post(f"{API}/pool", json={
            "scheduled_date": TestPool.date,
            "attended": "sim",
            "provider_name": "TEST_Provider",
            "status": "concluido",
        })
        assert r.status_code == 200, r.text
        assert r.json()["provider_name"] == "TEST_Provider"
        assert r.json()["status"] == "concluido"

    def test_list_pool(self, api):
        r = api.get(f"{API}/pool")
        assert r.status_code == 200
        assert any(p["scheduled_date"] == TestPool.date for p in r.json())


# ===== Reports =====
class TestReports:
    @pytest.mark.parametrize("period", ["daily", "weekly", "monthly"])
    def test_overview(self, api, period):
        r = api.get(f"{API}/reports/overview", params={"period": period})
        assert r.status_code == 200
        d = r.json()
        assert d["period"] == period
        for k in ["summary", "occurrences", "tasks", "keys", "pool"]:
            assert k in d
