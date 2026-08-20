import sys
from app import app, db
from models import User, Farmer, CollectionCenter, MilkCollection

def run_multiuser_tests():
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
    print("  RUNNING MULTI-USER ISOLATION & SPA ROUTING TESTS")
    print("=" * 60)

    # 1. SPA Frontend Delivery Tests
    res_root = client.get("/")
    check("GET / serves compiled index.html", res_root.status_code == 200 and b"root" in res_root.data)

    res_spa_dash = client.get("/dashboard")
    check("GET /dashboard serves SPA fallback index.html", res_spa_dash.status_code == 200 and b"root" in res_spa_dash.data)

    res_spa_login = client.get("/login")
    check("GET /login serves SPA fallback index.html", res_spa_login.status_code == 200 and b"root" in res_spa_login.data)

    res_spa_acc = client.get("/account")
    check("GET /account serves SPA fallback index.html", res_spa_acc.status_code == 200 and b"root" in res_spa_acc.data)

    res_invalid_api = client.get("/api/nonexistent-endpoint")
    check("GET /api/nonexistent returns JSON 404 (not HTML)", res_invalid_api.status_code == 404 and res_invalid_api.is_json)

    # 2. Demo User Login
    demo_login = client.post("/api/auth/login", json={
        "email": "demo@dairyscm.com",
        "password": "demo123"
    })
    check("Demo user login succeeds (200)", demo_login.status_code == 200)
    demo_token = demo_login.get_json().get("token")
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    demo_dash = client.get("/api/dashboard", headers=demo_headers)
    check("Demo user sees baseline farmers", demo_dash.get_json()["kpis"]["total_farmers"] == 12)

    # 3. User A Registration
    with app.app_context():
        # Clean test users if already exist
        uA = User.query.filter_by(email="usera_test@coop.org").first()
        if uA: db.session.delete(uA)
        uB = User.query.filter_by(email="userb_test@dairy.org").first()
        if uB: db.session.delete(uB)
        db.session.commit()

    reg_A = client.post("/api/auth/register", json={
        "name": "User Alpha",
        "email": "usera_test@coop.org",
        "password": "Password123",
        "confirm_password": "Password123",
        "organization_name": "Alpha Dairy Cooperative",
        "location": "Pune, Maharashtra",
        "phone": "+91 99887 76655"
    })
    check("User A registration succeeds (201)", reg_A.status_code == 201)
    token_A = reg_A.get_json().get("token")
    headers_A = {"Authorization": f"Bearer {token_A}"}

    # User A starts with 0 farmers
    dash_A_init = client.get("/api/dashboard", headers=headers_A)
    check("User A initial dashboard has 0 farmers", dash_A_init.get_json()["kpis"]["total_farmers"] == 0)

    # 4. User A Adds Business Data
    farmer_A_res = client.post("/api/farmers", headers=headers_A, json={
        "name": "Alpha Farmer Ramesh",
        "village": "Pune North",
        "cows": 14,
        "daily_yield_liters": 190.0,
        "quality_score": 95.0,
        "lat": 18.52,
        "lng": 73.85
    })
    check("User A creates Farmer Alpha (201)", farmer_A_res.status_code == 201)
    farmer_A_id = farmer_A_res.get_json()["id"]

    center_A_res = client.post("/api/collection-centers", headers=headers_A, json={
        "name": "Alpha Chilling Hub",
        "location": "Pune",
        "capacity_liters": 4500.0,
        "current_stock": 800.0,
        "temp_celsius": 3.9
    })
    check("User A creates Collection Center Alpha (201)", center_A_res.status_code == 201)
    center_A_id = center_A_res.get_json()["id"]

    coll_A_res = client.post("/api/collections", headers=headers_A, json={
        "farmer_id": farmer_A_id,
        "center_id": center_A_id,
        "quantity_liters": 160.0,
        "fat_pct": 4.4,
        "snf_pct": 8.7,
        "quality_score": 95.5
    })
    check("User A records Milk Collection (201)", coll_A_res.status_code == 201)

    dash_A_after = client.get("/api/dashboard", headers=headers_A)
    check("User A dashboard now shows 1 farmer and 1 center",
          dash_A_after.get_json()["kpis"]["total_farmers"] == 1 and dash_A_after.get_json()["kpis"]["collection_centers"] == 1)

    # 5. User B Registration
    reg_B = client.post("/api/auth/register", json={
        "name": "User Beta",
        "email": "userb_test@dairy.org",
        "password": "Password123",
        "confirm_password": "Password123",
        "organization_name": "Beta Dairy Federation",
        "location": "Jaipur, Rajasthan",
        "phone": "+91 91234 56789"
    })
    check("User B registration succeeds (201)", reg_B.status_code == 201)
    token_B = reg_B.get_json().get("token")
    headers_B = {"Authorization": f"Bearer {token_B}"}

    # 6. CRITICAL DATA ISOLATION CHECKS FOR USER B
    farmers_B = client.get("/api/farmers", headers=headers_B)
    check("User B GET /api/farmers returns 0 records (User A data invisible)", len(farmers_B.get_json()["farmers"]) == 0)

    centers_B = client.get("/api/collection-centers", headers=headers_B)
    check("User B GET /api/collection-centers returns 0 records", len(centers_B.get_json()["centers"]) == 0)

    dash_B = client.get("/api/dashboard", headers=headers_B)
    check("User B dashboard shows 0 farmers & 0 liters", dash_B.get_json()["kpis"]["total_farmers"] == 0 and dash_B.get_json()["kpis"]["daily_production_liters"] == 0)

    attack_get = client.get(f"/api/farmers/{farmer_A_id}", headers=headers_B)
    check("User B attempting to read User A's farmer ID returns 404", attack_get.status_code == 404)

    attack_del = client.delete(f"/api/farmers/{farmer_A_id}", headers=headers_B)
    check("User B attempting to delete User A's farmer ID returns 404", attack_del.status_code == 404)

    # 7. User B Enters Their Own Separate Data
    farmer_B_res = client.post("/api/farmers", headers=headers_B, json={
        "name": "Beta Farmer Sunita",
        "village": "Jaipur Rural",
        "cows": 8,
        "daily_yield_liters": 105.0,
        "quality_score": 92.0,
        "lat": 26.91,
        "lng": 75.78
    })
    check("User B creates Farmer Beta (201)", farmer_B_res.status_code == 201)

    # 8. User A Verification (User B's data is invisible to User A)
    farmers_A_recheck = client.get("/api/farmers", headers=headers_A)
    farmers_A_list = farmers_A_recheck.get_json()["farmers"]
    check("User A sees ONLY their 1 farmer (User B farmer invisible)", len(farmers_A_list) == 1 and farmers_A_list[0]["name"] == "Alpha Farmer Ramesh")

    # 9. Clean up test users
    with app.app_context():
        uA = User.query.filter_by(email="usera_test@coop.org").first()
        if uA: db.session.delete(uA)
        uB = User.query.filter_by(email="userb_test@dairy.org").first()
        if uB: db.session.delete(uB)
        db.session.commit()

    print("=" * 60)
    print(f"  MULTI-USER TESTS: {passed}/{total} PASSED")
    print("=" * 60)
    return 0 if passed == total else 1

if __name__ == "__main__":
    exit(run_multiuser_tests())
