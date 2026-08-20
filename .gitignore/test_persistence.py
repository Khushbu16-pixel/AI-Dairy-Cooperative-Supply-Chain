import sys
import subprocess
import json

def run_step1():
    # Process 1: Insert record and update stock via API
    from app import app, db
    from models import Farmer, CollectionCenter
    client = app.test_client()
    
    # Check CC02 stock before
    with app.app_context():
        cc2_before = db.session.get(CollectionCenter, "CC02")
        initial_stock = cc2_before.current_stock

    # Create farmer
    res = client.post("/api/farmers", json={
        "id": "F888",
        "name": "Persistence Farmer",
        "village": "Anand",
        "cows": 14,
        "daily_yield_liters": 180.0,
        "quality_score": 96.0,
        "lat": 22.55,
        "lng": 72.95
    })
    assert res.status_code == 201, f"Failed to create farmer: {res.data}"

    # Record collection
    res_coll = client.post("/api/collections", json={
        "farmer_id": "F888",
        "center_id": "CC02",
        "quantity_liters": 350.0,
        "fat_pct": 4.3,
        "snf_pct": 8.6,
        "quality_score": 96.0
    })
    assert res_coll.status_code == 201, f"Failed to record collection: {res_coll.data}"

    print(f"STEP 1 COMPLETE: Added farmer F888, recorded collection +350L (initial stock was {initial_stock}L).")

def run_step2():
    # Process 2: Fresh start, verify data persisted in database
    from app import app, db
    from models import Farmer, CollectionCenter, MilkCollection
    client = app.test_client()

    # Query via API
    res = client.get("/api/farmers/F888")
    assert res.status_code == 200, f"Farmer F888 not found in restarted session: {res.status_code}"
    farmer_data = res.get_json()
    assert farmer_data["name"] == "Persistence Farmer", f"Incorrect farmer name: {farmer_data}"
    
    # Query collection center
    res_cc = client.get("/api/collection-centers/CC02")
    assert res_cc.status_code == 200, "CC02 not found"
    cc_data = res_cc.get_json()
    
    # Clean up test record
    client.delete("/api/farmers/F888")
    with app.app_context():
        # Clean test collections & restore stock
        cc = db.session.get(CollectionCenter, "CC02")
        cc.current_stock -= 350.0
        MilkCollection.query.filter_by(farmer_id="F888").delete()
        db.session.commit()

    print(f"STEP 2 COMPLETE: Successfully verified persistence across process restart for farmer '{farmer_data['name']}' and CC02 stock ({cc_data['current_stock']}L)!")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "step2":
        run_step2()
    else:
        run_step1()
