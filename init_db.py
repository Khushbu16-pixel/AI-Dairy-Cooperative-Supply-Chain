import sys
import os
import json
import argparse
from datetime import datetime, timedelta, date, timezone
from flask import Flask
from dotenv import load_dotenv

from database import db, get_database_uri
from models import (
    User, Farmer, CollectionCenter, ProcessingPlant, Distributor, Retailer,
    MilkCollection, QualityTest, InventoryTransaction, ProcessingBatch,
    RetailDemandRecord, DeliveryRecord
)

load_dotenv()

CITY_COORDINATES = {
    "Anand": (22.5560, 72.9510),
    "Mehsana": (23.5930, 72.3690),
    "Karnal": (29.6850, 76.9890),
    "Ludhiana": (30.9010, 75.8570),
    "Pune": (18.5204, 73.8567),
    "Jaipur": (26.9124, 75.7873),
    "Thrissur": (10.5276, 76.2144),
    "Guntur": (16.3067, 80.4365),
    "Amritsar": (31.6340, 74.8723),
    "Hassan": (13.0072, 76.0963),
    "Hisar": (29.1539, 75.7229),
    "Bhopal": (23.2599, 77.4126),
    "Delhi": (28.6139, 77.2090),
    "Mumbai": (19.0760, 72.8777),
    "Bengaluru": (12.9716, 77.5946),
    "Chennai": (13.0827, 80.2707),
    "Hyderabad": (17.3850, 78.4867),
    "Kolkata": (22.5726, 88.3639),
    "Ahmedabad": (23.0225, 72.5714),
    "Chandigarh": (30.7333, 76.7794),
}

INITIAL_FARMERS = [
    ("F001", "Ramesh Patel",     "Anand",      12, 180.0, 94.2, 22.556, 72.951),
    ("F002", "Sunita Devi",      "Mehsana",     8, 110.0, 91.5, 23.593, 72.369),
    ("F003", "Arjun Singh",      "Karnal",     20, 310.0, 96.0, 29.685, 76.989),
    ("F004", "Priya Sharma",     "Ludhiana",   15, 220.0, 89.3, 30.901, 75.857),
    ("F005", "Vikram Rao",       "Pune",       10, 140.0, 93.8, 18.520, 73.856),
    ("F006", "Meena Kumari",     "Jaipur",     18, 260.0, 88.7, 26.912, 75.787),
    ("F007", "Suresh Nair",      "Thrissur",    7,  95.0, 97.1, 10.527, 76.214),
    ("F008", "Anita Reddy",      "Guntur",     14, 195.0, 90.4, 16.306, 80.436),
    ("F009", "Harpal Grewal",    "Amritsar",   25, 380.0, 95.6, 31.633, 74.872),
    ("F010", "Kavitha Murthy",   "Hassan",     11, 155.0, 92.3, 13.008, 76.099),
    ("F011", "Dilip Chaudhary",  "Hisar",      16, 240.0, 87.9, 29.154, 75.722),
    ("F012", "Radha Bai",        "Bhopal",      9, 125.0, 94.7, 23.259, 77.413),
]

INITIAL_COLLECTION_CENTERS = [
    ("CC01", "Anand Primary CC",    "Anand",    5000.0, 3800.0, 4.2),
    ("CC02", "Mehsana Central CC",  "Mehsana",  4000.0, 2900.0, 3.8),
    ("CC03", "Karnal Hub CC",       "Karnal",   8000.0, 6200.0, 4.5),
    ("CC04", "Ludhiana CC",         "Ludhiana", 6000.0, 4100.0, 4.1),
    ("CC05", "Pune Dairy CC",       "Pune",     3500.0, 2600.0, 3.9),
]

INITIAL_PROCESSING_PLANTS = [
    ("PP01", "Anand Processing Plant",  "Anand",    200000.0, 87.0, ["Milk","Butter","Cheese","Ghee"]),
    ("PP02", "Punjab Milk Plant",       "Ludhiana", 150000.0, 79.0, ["Milk","Paneer","Yogurt"]),
    ("PP03", "Deccan Dairy Plant",      "Pune",     100000.0, 82.0, ["Milk","Ice-Cream","Butter"]),
    ("PP04", "Rajasthan Dairy Hub",     "Jaipur",   120000.0, 74.0, ["Milk","Ghee","Khoya"]),
]

INITIAL_DISTRIBUTORS = [
    ("D01", "NorthStar Logistics",   "North India", 18, 12, 94.2),
    ("D02", "WestFlow Dairy Trans",  "West India",  14, 10, 91.8),
    ("D03", "SouthLink Carriers",    "South India", 11,  8, 96.5),
    ("D04", "EastBridge Supply",     "East India",   9,  6, 88.3),
]

INITIAL_RETAILERS = [
    ("R001", "FreshMart Delhi",       "Supermarket", "Delhi",      45000.0, 3200.0),
    ("R002", "MilkPoint Mumbai",      "Chain Store",  "Mumbai",    38000.0, 2800.0),
    ("R003", "DairyHub Bangalore",    "Supermarket", "Bengaluru",  30000.0, 1900.0),
    ("R004", "PureMilk Chennai",      "Retailer",    "Chennai",    22000.0, 1500.0),
    ("R005", "GreenFarm Hyderabad",   "Supermarket", "Hyderabad",  25000.0, 2100.0),
    ("R006", "AlphaGrocery Kolkata",  "Chain Store",  "Kolkata",   18000.0, 1200.0),
    ("R007", "NatureDairy Ahmedabad", "Retailer",    "Ahmedabad",  20000.0, 1700.0),
    ("R008", "FarmFresh Chandigarh",  "Supermarket", "Chandigarh", 15000.0,  900.0),
]


def create_app_for_db():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app


def init_database(reset=False):
    app = create_app_for_db()
    with app.app_context():
        if reset:
            print("[INFO] Resetting database tables...")
            db.drop_all()
            db.create_all()
            print("[INFO] Tables recreated successfully.")
        else:
            db.create_all()
            if User.query.count() > 0:
                print(f"[INFO] Database already contains {User.query.count()} user(s). Skipping baseline seed.")
                return

        print("[INFO] Creating default Demo User (demo@dairyscm.com / demo123)...")
        demo_user = User(
            name="Demo Dairy Operator",
            email="demo@dairyscm.com",
            organization_name="National Dairy Federation",
            location="Anand, Gujarat",
            phone="+91 98765 43210"
        )
        demo_user.set_password("demo123")
        db.session.add(demo_user)
        db.session.commit()

        uid = demo_user.id
        print(f"[INFO] Seeding baseline operational entities for Demo User (ID: {uid})...")
        
        # 1. Farmers
        for fid, name, village, cows, yld, q, lat, lng in INITIAL_FARMERS:
            f = Farmer(
                id=fid, user_id=uid, name=name, village=village, cows=cows,
                daily_yield_liters=yld, quality_score=q, lat=lat, lng=lng,
                is_seed=True
            )
            db.session.add(f)

        # 2. Collection Centers
        for cid, name, loc, cap, stk, temp in INITIAL_COLLECTION_CENTERS:
            coords = CITY_COORDINATES.get(loc, (22.5, 73.0))
            cc = CollectionCenter(
                id=cid, user_id=uid, name=name, location=loc, capacity_liters=cap,
                current_stock=stk, temp_celsius=temp, lat=coords[0], lng=coords[1],
                is_seed=True
            )
            db.session.add(cc)

        # 3. Processing Plants
        for pid, name, loc, cap, util, prods in INITIAL_PROCESSING_PLANTS:
            coords = CITY_COORDINATES.get(loc, (22.5, 73.0))
            pp = ProcessingPlant(
                id=pid, user_id=uid, name=name, location=loc, capacity_liters_per_day=cap,
                utilization_pct=util, products_json=json.dumps(prods),
                lat=coords[0], lng=coords[1], is_seed=True
            )
            db.session.add(pp)

        # 4. Distributors
        for did, name, reg, routes, veh, otp in INITIAL_DISTRIBUTORS:
            d = Distributor(
                id=did, user_id=uid, name=name, region=reg, delivery_routes=routes,
                vehicles=veh, on_time_pct=otp, is_seed=True
            )
            db.session.add(d)

        # 5. Retailers
        for rid, name, rtype, city, demand, stock in INITIAL_RETAILERS:
            coords = CITY_COORDINATES.get(city, (20.0, 77.0))
            r = Retailer(
                id=rid, user_id=uid, name=name, type=rtype, city=city,
                monthly_demand_liters=demand, current_stock_liters=stock,
                lat=coords[0], lng=coords[1], is_seed=True
            )
            db.session.add(r)

        db.session.commit()

        # 6. Seed 30-Day Historical Collections & Demand
        print("[INFO] Seeding 30-day historical collections and demand logs...")
        now = datetime.now(timezone.utc)
        farmer_cc_map = {
            "F001": "CC01", "F002": "CC02", "F003": "CC03", "F004": "CC04",
            "F005": "CC05", "F006": "CC01", "F007": "CC05", "F008": "CC05",
            "F009": "CC04", "F010": "CC05", "F011": "CC03", "F012": "CC01"
        }

        for day_offset in range(30, 0, -1):
            day_time = now - timedelta(days=day_offset)
            record_d = day_time.date()

            for fid, name, village, cows, base_yield, base_q, _, _ in INITIAL_FARMERS:
                factor = 1.0 + 0.05 * ((day_offset % 7) - 3) / 3.0
                qty = round(base_yield * factor, 1)
                q_score = round(max(80.0, min(99.0, base_q + ((day_offset % 5) - 2) * 0.4)), 1)
                cc_id = farmer_cc_map.get(fid, "CC01")

                coll = MilkCollection(
                    user_id=uid, farmer_id=fid, center_id=cc_id, quantity_liters=qty,
                    fat_pct=round(4.0 + (day_offset % 4) * 0.1, 2),
                    snf_pct=round(8.5 + (day_offset % 3) * 0.1, 2),
                    quality_score=q_score, collected_at=day_time,
                    is_seed=True
                )
                db.session.add(coll)

            for rid, name, rtype, city, monthly_dem, _ in INITIAL_RETAILERS:
                daily_base = monthly_dem / 30.0
                day_of_week = day_time.weekday()
                weekend_boost = 1.15 if day_of_week in (5, 6) else 0.95
                cycle_var = 1.0 + 0.04 * ((day_offset % 6) - 2.5)
                actual_day_dem = round(daily_base * weekend_boost * cycle_var, 1)
                
                dem_rec = RetailDemandRecord(
                    user_id=uid, retailer_id=rid, record_date=record_d,
                    demand_liters=actual_day_dem,
                    delivered_liters=round(actual_day_dem * 0.98, 1),
                    is_seed=True
                )
                db.session.add(dem_rec)

        # 7. Initial Inventory Transactions
        for cid, name, loc, cap, stk, temp in INITIAL_COLLECTION_CENTERS:
            inv = InventoryTransaction(
                user_id=uid,
                transaction_type="collection_in",
                source_type="farmer_batch",
                source_id="INITIAL_SEED",
                target_type="collection_center",
                target_id=cid,
                quantity_liters=stk,
                timestamp=now,
                notes="Initial baseline center stock",
                is_seed=True
            )
            db.session.add(inv)

        # 8. Delivery Records
        for did, name, reg, routes, veh, otp in INITIAL_DISTRIBUTORS:
            deliv = DeliveryRecord(
                user_id=uid,
                distributor_id=did,
                origin=f"{reg} Distribution Hub",
                destination="Regional Retail Network",
                distance_km=round(routes * 125.0, 1),
                fuel_liters=round(routes * 28.0, 1),
                on_time=True if otp >= 90 else False,
                delivery_date=now,
                is_seed=True
            )
            db.session.add(deliv)

        db.session.commit()
        print(f"[SUCCESS] Database initialized successfully. Demo user: demo@dairyscm.com / demo123")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Initialize and seed the Dairy SCM database.")
    parser.add_argument("--reset", action="store_true", help="Drop existing tables and recreate seed data.")
    args = parser.parse_args()
    init_database(reset=args.reset)
