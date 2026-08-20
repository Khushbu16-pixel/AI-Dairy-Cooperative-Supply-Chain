import json
from app import app, db
from models import Farmer, CollectionCenter, ProcessingPlant, Distributor, Retailer, MilkCollection, InventoryTransaction

def run_tests():
    client = app.test_client()
    passed = 0
    total = 0

    def check(name, condition, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] {name}")
        else:
            print(f"  [FAIL] {name}: {details}")

    print("=" * 60)
    print("  RUNNING DAIRY SCM BACKEND VERIFICATION TESTS")
    print("=" * 60)

    # 1. Dashboard
    res = client.get("/api/dashboard")
    check("GET /api/dashboard status 200", res.status_code == 200)
    d = res.get_json()
    check("Dashboard contains KPIs", "kpis" in d and d["kpis"]["total_farmers"] == 12)
    check("Dashboard contains 30-day trend", len(d.get("production_trend", {}).get("labels", [])) == 30)
    check("Dashboard contains quality distribution", len(d.get("quality_dist", {}).get("labels", [])) == 4)

    # 2. Farmers
    res = client.get("/api/farmers")
    check("GET /api/farmers status 200", res.status_code == 200)
    d = res.get_json()
    check("Farmers list has 12 records", len(d.get("farmers", [])) == 12 and d.get("total") == 12)

    # 3. Collection Centers
    res = client.get("/api/collection-centers")
    check("GET /api/collection-centers status 200", res.status_code == 200)
    d = res.get_json()
    check("Collection centers list has 5 records", len(d.get("centers", [])) == 5)
    first_cc = d["centers"][0]
    check("CC contains utilization_pct & status", "utilization_pct" in first_cc and "status" in first_cc)

    # 4. Processing Plants
    res = client.get("/api/processing-plants")
    check("GET /api/processing-plants status 200", res.status_code == 200)
    d = res.get_json()
    check("Processing plants has 4 records", len(d.get("plants", [])) == 4)
    check("PP products is list", isinstance(d["plants"][0]["products"], list))

    # 5. Distributors
    res = client.get("/api/distributors")
    check("GET /api/distributors status 200", res.status_code == 200)
    d = res.get_json()
    check("Distributors has 4 records", len(d.get("distributors", [])) == 4)

    # 6. Retailers
    res = client.get("/api/retailers")
    check("GET /api/retailers status 200", res.status_code == 200)
    d = res.get_json()
    check("Retailers has 8 records", len(d.get("retailers", [])) == 8)

    # 7. AI Demand Forecast
    res = client.get("/api/ai/demand-forecast")
    check("GET /api/ai/demand-forecast status 200", res.status_code == 200)
    d = res.get_json()
    check("Forecast has forecasts list & model", len(d.get("forecasts", [])) == 8 and "model" in d and "accuracy" in d)
    first_fc = d["forecasts"][0]
    check("Forecast has 7 predicted days", len(first_fc.get("days", [])) == 7 and len(first_fc.get("predicted_liters", [])) == 7)

    # 8. AI Route Optimization
    res = client.get("/api/ai/route-optimization")
    check("GET /api/ai/route-optimization status 200", res.status_code == 200)
    d = res.get_json()
    check("Route optimization has 4 regional distributors", len(d.get("optimizations", [])) == 4)
    first_opt = d["optimizations"][0]
    check("Route optimization contains cost and fuel savings", first_opt["cost_saving_pct"] > 0 and first_opt["fuel_saving_pct"] > 0)

    # 9. AI Quality Alerts
    res = client.get("/api/ai/quality-alerts")
    check("GET /api/ai/quality-alerts status 200", res.status_code == 200)
    d = res.get_json()
    check("Quality alerts returns alerts list and monitoring label", "alerts" in d and "monitoring" in d)

    # 10. AI Production Insights
    res = client.get("/api/ai/production-insights")
    check("GET /api/ai/production-insights status 200", res.status_code == 200)
    d = res.get_json()
    check("Production insights has 12 farmers", len(d.get("insights", [])) == 12)
    first_ins = d["insights"][0]
    check("Insight has trend and suggestion", first_ins["trend"] in ["Increasing", "Stable", "Declining"] and "suggestion" in first_ins)

    # 11. AI Supply-Demand Balance
    res = client.get("/api/ai/supply-demand-balance")
    check("GET /api/ai/supply-demand-balance status 200", res.status_code == 200)
    d = res.get_json()
    check("Balance contains supply, demand, regional breakdown", "monthly_supply_liters" in d and "supply_by_region" in d and "demand_by_region" in d)

    # 12. CRUD Test: Create, Read, Update, Delete Farmer
    new_farmer_payload = {
        "id": "F999",
        "name": "Test Farmer",
        "village": "Gujarat Farm",
        "cows": 15,
        "daily_yield_liters": 210.0,
        "quality_score": 93.5,
        "lat": 23.1,
        "lng": 72.8
    }
    create_res = client.post("/api/farmers", json=new_farmer_payload)
    check("POST /api/farmers status 201", create_res.status_code == 201)
    
    get_res = client.get("/api/farmers/F999")
    check("GET /api/farmers/F999 status 200", get_res.status_code == 200 and get_res.get_json()["name"] == "Test Farmer")

    update_res = client.patch("/api/farmers/F999", json={"daily_yield_liters": 250.0})
    check("PATCH /api/farmers/F999 status 200", update_res.status_code == 200 and update_res.get_json()["daily_yield_liters"] == 250.0)

    del_res = client.delete("/api/farmers/F999")
    check("DELETE /api/farmers/F999 status 200", del_res.status_code == 200)

    get_after_del = client.get("/api/farmers/F999")
    check("GET /api/farmers/F999 after delete returns 404", get_after_del.status_code == 404)

    # 13. Milk Collection Workflow Test
    with app.app_context():
        cc_before = CollectionCenter.query.get("CC01")
        stock_before = cc_before.current_stock

    coll_payload = {
        "farmer_id": "F001",
        "center_id": "CC01",
        "quantity_liters": 120.0,
        "fat_pct": 4.5,
        "snf_pct": 8.7,
        "quality_score": 95.0
    }
    coll_res = client.post("/api/collections", json=coll_payload)
    check("POST /api/collections status 201", coll_res.status_code == 201)

    with app.app_context():
        cc_after = CollectionCenter.query.get("CC01")
        check("Collection center stock increased by 120 L", round(cc_after.current_stock - stock_before, 1) == 120.0)

    # 14. Inventory Transfer Workflow Test
    transfer_payload = {
        "center_id": "CC01",
        "plant_id": "PP01",
        "quantity_liters": 200.0
    }
    transfer_res = client.post("/api/inventory/transfer", json=transfer_payload)
    check("POST /api/inventory/transfer status 200", transfer_res.status_code == 200)

    with app.app_context():
        cc_after_transfer = CollectionCenter.query.get("CC01")
        check("Collection center stock decreased by 200 L", round(cc_after.current_stock - cc_after_transfer.current_stock, 1) == 200.0)

    # 15. Inventory Transactions Log
    tx_res = client.get("/api/inventory/transactions")
    check("GET /api/inventory/transactions status 200", tx_res.status_code == 200 and len(tx_res.get_json().get("transactions", [])) > 0)

    print("=" * 60)
    print(f"  TESTS COMPLETE: {passed}/{total} PASSED")
    print("=" * 60)

    if passed == total:
        print("[SUCCESS] All backend APIs and workflows verified successfully!")
        return 0
    else:
        print(f"[FAILURE] {total - passed} test(s) failed.")
        return 1

if __name__ == "__main__":
    exit(run_tests())
