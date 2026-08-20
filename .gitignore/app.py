from flask import Flask, render_template, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import os
import json
from datetime import datetime, timedelta, date, timezone

load_dotenv()

from database import db, get_database_uri
from models import (
    User, Farmer, CollectionCenter, ProcessingPlant, Distributor, Retailer,
    MilkCollection, QualityTest, InventoryTransaction, ProcessingBatch,
    RetailDemandRecord, DeliveryRecord
)
from services.auth_service import generate_token, login_required
from services.ai_service import (
    compute_demand_forecast,
    compute_route_optimization,
    compute_quality_alerts,
    compute_production_insights,
    compute_supply_demand_balance
)
from services.watsonx_service import is_watsonx_configured

# Path to compiled React frontend
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
FRONTEND_ASSETS = os.path.join(FRONTEND_DIST, "assets")

app = Flask(
    __name__,
    static_folder=FRONTEND_ASSETS if os.path.exists(FRONTEND_ASSETS) else os.path.join(BASE_DIR, "static"),
    static_url_path="/assets" if os.path.exists(FRONTEND_ASSETS) else "/static",
    template_folder=os.path.join(BASE_DIR, "templates")
)

app.config['SQLALCHEMY_DATABASE_URI'] = get_database_uri()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
CORS(app)  # Allows dev server cross-origin if needed

# Auto-create tables on launch
with app.app_context():
    db.create_all()


# ── Error Handlers ─────────────────────────────────────

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad Request", "message": str(e.description if hasattr(e, 'description') else e)}), 400

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "Unauthorized", "message": str(e.description if hasattr(e, 'description') else "Please log in")}), 401

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not Found", "message": "API endpoint not found"}), 404
    # SPA Fallback for client-side routing
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify({"error": "Not Found"}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred."}), 500


# ── Single-Origin Frontend Serving & SPA Routing ───────

@app.route("/")
def serve_root():
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("index.html")

@app.route("/<path:path>")
def serve_spa(path):
    if path.startswith("api/") or path == "api":
        return jsonify({"error": "Not Found", "message": "API endpoint not found"}), 404
    # If file exists in frontend dist root (e.g., favicon.svg, vite.svg)
    if os.path.exists(os.path.join(FRONTEND_DIST, path)):
        return send_from_directory(FRONTEND_DIST, path)
    # SPA fallback for React routes (/dashboard, /login, /register, /account, /farmers, etc.)
    if os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return render_template("index.html")


# ── Authentication Endpoints ───────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    org_name = data.get("organization_name", "").strip()
    location = data.get("location", "").strip()
    phone = data.get("phone", "").strip()

    if not name or not email or not password or not org_name or not location:
        return jsonify({"error": "All required fields (Name, Email, Password, Organization, Location) must be provided."}), 400

    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long."}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email address already exists. Please log in."}), 400

    user = User(
        name=name,
        email=email,
        organization_name=org_name,
        location=location,
        phone=phone
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({
        "success": True,
        "message": "Account created successfully.",
        "user": user.to_dict(),
        "token": token
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password."}), 401

    token = generate_token(user.id)
    return jsonify({
        "success": True,
        "message": "Login successful.",
        "user": user.to_dict(),
        "token": token
    })


@app.route("/api/auth/me", methods=["GET"])
@login_required
def get_current_user_profile():
    return jsonify({
        "user": request.current_user.to_dict()
    })


@app.route("/api/auth/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json() or {}
    user = request.current_user

    if "name" in data and data["name"].strip():
        user.name = data["name"].strip()
    if "organization_name" in data and data["organization_name"].strip():
        user.organization_name = data["organization_name"].strip()
    if "location" in data and data["location"].strip():
        user.location = data["location"].strip()
    if "phone" in data:
        user.phone = data["phone"].strip()

    db.session.commit()
    return jsonify({
        "success": True,
        "message": "Profile updated successfully.",
        "user": user.to_dict()
    })


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    return jsonify({"success": True, "message": "Logged out successfully."})


# ── Dashboard API (User-Isolated) ──────────────────────

@app.route("/api/dashboard", methods=["GET"])
@login_required
def dashboard():
    uid = request.current_user.id
    farmers = Farmer.query.filter_by(user_id=uid).all()
    centers = CollectionCenter.query.filter_by(user_id=uid).all()
    plants  = ProcessingPlant.query.filter_by(user_id=uid).all()
    distributors = Distributor.query.filter_by(user_id=uid).all()
    retailers = Retailer.query.filter_by(user_id=uid).all()

    total_farmers = len(farmers)
    total_daily = sum(f.daily_yield_liters for f in farmers)
    total_cap   = sum(cc.capacity_liters for cc in centers)
    total_stock = sum(cc.current_stock for cc in centers)
    monthly_dem = sum(r.monthly_demand_liters for r in retailers)
    avg_util    = (sum(p.utilization_pct for p in plants) / len(plants)) if plants else 0.0
    avg_quality = (sum(f.quality_score for f in farmers) / total_farmers) if total_farmers else 0.0
    avg_otp     = (sum(d.on_time_pct for d in distributors) / len(distributors)) if distributors else 0.0
    storage_util = round((total_stock / total_cap * 100), 1) if total_cap > 0 else 0.0

    # 30-Day Production Trend from current user's MilkCollection records
    labels = []
    trend_data = []
    now = datetime.now(timezone.utc)
    for day_offset in range(29, -1, -1):
        target_date = (now - timedelta(days=day_offset)).date()
        labels.append(target_date.strftime("%d %b"))
        
        day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end   = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
        
        day_sum = db.session.query(db.func.sum(MilkCollection.quantity_liters))\
            .filter(MilkCollection.user_id == uid, MilkCollection.collected_at >= day_start, MilkCollection.collected_at <= day_end).scalar()
        
        if day_sum is not None and day_sum > 0:
            trend_data.append(round(day_sum, 1))
        else:
            trend_data.append(round(total_daily, 1) if total_daily > 0 else 0.0)

    # Quality score distribution
    q_excellent = sum(1 for f in farmers if f.quality_score >= 95.0)
    q_good      = sum(1 for f in farmers if 90.0 <= f.quality_score < 95.0)
    q_avg       = sum(1 for f in farmers if 85.0 <= f.quality_score < 90.0)
    q_below     = sum(1 for f in farmers if f.quality_score < 85.0)

    alerts_res = compute_quality_alerts(user_id=uid)
    active_alerts_count = len(alerts_res.get("alerts", []))

    return jsonify({
        "kpis": {
            "total_farmers": total_farmers,
            "daily_production_liters": round(total_daily, 1),
            "collection_centers": len(centers),
            "storage_utilization_pct": storage_util,
            "processing_plants": len(plants),
            "avg_plant_utilization_pct": round(avg_util, 1),
            "total_retailers": len(retailers),
            "monthly_demand_liters": round(monthly_dem, 1),
            "avg_quality_score": round(avg_quality, 1),
            "on_time_delivery_pct": round(avg_otp, 1),
        },
        "production_trend": {
            "labels": labels,
            "data": trend_data
        },
        "quality_dist": {
            "labels": ["Excellent (>95)", "Good (90-95)", "Average (85-90)", "Below (<85)"],
            "data": [q_excellent, q_good, q_avg, q_below]
        },
        "alerts_count": active_alerts_count,
        "watsonx_configured": is_watsonx_configured(),
        "user": request.current_user.to_dict()
    })


# ── Farmers Endpoints & CRUD (User-Isolated) ───────────

@app.route("/api/farmers", methods=["GET"])
@login_required
def get_farmers():
    uid = request.current_user.id
    farmers = Farmer.query.filter_by(user_id=uid).order_by(Farmer.id.asc()).all()
    return jsonify({
        "farmers": [f.to_dict() for f in farmers],
        "total": len(farmers)
    })

@app.route("/api/farmers/<farmer_id>", methods=["GET"])
@login_required
def get_farmer(farmer_id):
    uid = request.current_user.id
    f = Farmer.query.filter_by(id=farmer_id, user_id=uid).first()
    if not f:
        return jsonify({"error": "Farmer not found"}), 404
    return jsonify(f.to_dict())

@app.route("/api/farmers", methods=["POST"])
@login_required
def create_farmer():
    uid = request.current_user.id
    data = request.get_json() or {}
    if not data.get("name") or not data.get("village"):
        return jsonify({"error": "Fields 'name' and 'village' are required"}), 400
    
    farmer_id = data.get("id")
    if not farmer_id:
        count = Farmer.query.filter_by(user_id=uid).count() + 1
        farmer_id = f"F{count:03d}"
        while Farmer.query.get(farmer_id):
            count += 1
            farmer_id = f"F{count:03d}"

    farmer = Farmer(
        id=farmer_id,
        user_id=uid,
        name=data["name"].strip(),
        village=data["village"].strip(),
        cows=int(data.get("cows", 0)),
        daily_yield_liters=float(data.get("daily_yield_liters", 0.0)),
        quality_score=float(data.get("quality_score", 90.0)),
        lat=float(data.get("lat", 22.5)),
        lng=float(data.get("lng", 73.0)),
        is_seed=False
    )
    db.session.add(farmer)
    db.session.commit()
    return jsonify(farmer.to_dict()), 201

@app.route("/api/farmers/<farmer_id>", methods=["PUT", "PATCH"])
@login_required
def update_farmer(farmer_id):
    uid = request.current_user.id
    farmer = Farmer.query.filter_by(id=farmer_id, user_id=uid).first()
    if not farmer:
        return jsonify({"error": "Farmer not found"}), 404
    
    data = request.get_json() or {}
    if "name" in data: farmer.name = data["name"].strip()
    if "village" in data: farmer.village = data["village"].strip()
    if "cows" in data: farmer.cows = int(data["cows"])
    if "daily_yield_liters" in data: farmer.daily_yield_liters = float(data["daily_yield_liters"])
    if "quality_score" in data: farmer.quality_score = float(data["quality_score"])
    if "lat" in data: farmer.lat = float(data["lat"])
    if "lng" in data: farmer.lng = float(data["lng"])

    db.session.commit()
    return jsonify(farmer.to_dict())

@app.route("/api/farmers/<farmer_id>", methods=["DELETE"])
@login_required
def delete_farmer(farmer_id):
    uid = request.current_user.id
    farmer = Farmer.query.filter_by(id=farmer_id, user_id=uid).first()
    if not farmer:
        return jsonify({"error": "Farmer not found"}), 404
    db.session.delete(farmer)
    db.session.commit()
    return jsonify({"success": True, "message": f"Farmer {farmer_id} deleted successfully"})


# ── Collection Centers (User-Isolated) ─────────────────

@app.route("/api/collection-centers", methods=["GET"])
@login_required
def get_collection_centers():
    uid = request.current_user.id
    centers = CollectionCenter.query.filter_by(user_id=uid).order_by(CollectionCenter.id.asc()).all()
    return jsonify({"centers": [c.to_dict() for c in centers]})

@app.route("/api/collection-centers/<center_id>", methods=["GET"])
@login_required
def get_collection_center(center_id):
    uid = request.current_user.id
    c = CollectionCenter.query.filter_by(id=center_id, user_id=uid).first()
    if not c:
        return jsonify({"error": "Collection center not found"}), 404
    return jsonify(c.to_dict())

@app.route("/api/collection-centers", methods=["POST"])
@login_required
def create_collection_center():
    uid = request.current_user.id
    data = request.get_json() or {}
    if not data.get("name") or not data.get("location"):
        return jsonify({"error": "Fields 'name' and 'location' are required"}), 400
    
    center_id = data.get("id")
    if not center_id:
        count = CollectionCenter.query.filter_by(user_id=uid).count() + 1
        center_id = f"CC{count:02d}"
        while CollectionCenter.query.get(center_id):
            count += 1
            center_id = f"CC{count:02d}"

    center = CollectionCenter(
        id=center_id,
        user_id=uid,
        name=data["name"].strip(),
        location=data["location"].strip(),
        capacity_liters=float(data.get("capacity_liters", 5000.0)),
        current_stock=float(data.get("current_stock", 0.0)),
        temp_celsius=float(data.get("temp_celsius", 4.0)),
        lat=float(data.get("lat", 22.5)),
        lng=float(data.get("lng", 73.0)),
        is_seed=False
    )
    db.session.add(center)
    db.session.commit()
    return jsonify(center.to_dict()), 201

@app.route("/api/collection-centers/<center_id>", methods=["PUT", "PATCH"])
@login_required
def update_collection_center(center_id):
    uid = request.current_user.id
    c = CollectionCenter.query.filter_by(id=center_id, user_id=uid).first()
    if not c:
        return jsonify({"error": "Collection center not found"}), 404
    
    data = request.get_json() or {}
    if "name" in data: c.name = data["name"].strip()
    if "location" in data: c.location = data["location"].strip()
    if "capacity_liters" in data: c.capacity_liters = float(data["capacity_liters"])
    if "current_stock" in data: c.current_stock = float(data["current_stock"])
    if "temp_celsius" in data: c.temp_celsius = float(data["temp_celsius"])
    if "lat" in data: c.lat = float(data["lat"])
    if "lng" in data: c.lng = float(data["lng"])

    db.session.commit()
    return jsonify(c.to_dict())

@app.route("/api/collection-centers/<center_id>", methods=["DELETE"])
@login_required
def delete_collection_center(center_id):
    uid = request.current_user.id
    c = CollectionCenter.query.filter_by(id=center_id, user_id=uid).first()
    if not c:
        return jsonify({"error": "Collection center not found"}), 404
    db.session.delete(c)
    db.session.commit()
    return jsonify({"success": True, "message": f"Collection center {center_id} deleted successfully"})


# ── Processing Plants (User-Isolated) ──────────────────

@app.route("/api/processing-plants", methods=["GET"])
@login_required
def get_plants():
    uid = request.current_user.id
    plants = ProcessingPlant.query.filter_by(user_id=uid).order_by(ProcessingPlant.id.asc()).all()
    return jsonify({"plants": [p.to_dict() for p in plants]})

@app.route("/api/processing-plants/<plant_id>", methods=["GET"])
@login_required
def get_plant(plant_id):
    uid = request.current_user.id
    p = ProcessingPlant.query.filter_by(id=plant_id, user_id=uid).first()
    if not p:
        return jsonify({"error": "Processing plant not found"}), 404
    return jsonify(p.to_dict())

@app.route("/api/processing-plants", methods=["POST"])
@login_required
def create_plant():
    uid = request.current_user.id
    data = request.get_json() or {}
    if not data.get("name") or not data.get("location"):
        return jsonify({"error": "Fields 'name' and 'location' are required"}), 400
    
    plant_id = data.get("id")
    if not plant_id:
        count = ProcessingPlant.query.filter_by(user_id=uid).count() + 1
        plant_id = f"PP{count:02d}"
        while ProcessingPlant.query.get(plant_id):
            count += 1
            plant_id = f"PP{count:02d}"

    prods = data.get("products", ["Milk"])
    plant = ProcessingPlant(
        id=plant_id,
        user_id=uid,
        name=data["name"].strip(),
        location=data["location"].strip(),
        capacity_liters_per_day=float(data.get("capacity_liters_per_day", 100000.0)),
        utilization_pct=float(data.get("utilization_pct", 80.0)),
        products_json=json.dumps(prods if isinstance(prods, list) else [prods]),
        lat=float(data.get("lat", 22.5)),
        lng=float(data.get("lng", 73.0)),
        is_seed=False
    )
    db.session.add(plant)
    db.session.commit()
    return jsonify(plant.to_dict()), 201

@app.route("/api/processing-plants/<plant_id>", methods=["PUT", "PATCH"])
@login_required
def update_plant(plant_id):
    uid = request.current_user.id
    p = ProcessingPlant.query.filter_by(id=plant_id, user_id=uid).first()
    if not p:
        return jsonify({"error": "Processing plant not found"}), 404
    
    data = request.get_json() or {}
    if "name" in data: p.name = data["name"].strip()
    if "location" in data: p.location = data["location"].strip()
    if "capacity_liters_per_day" in data: p.capacity_liters_per_day = float(data["capacity_liters_per_day"])
    if "utilization_pct" in data: p.utilization_pct = float(data["utilization_pct"])
    if "products" in data:
        prods = data["products"]
        p.products_json = json.dumps(prods if isinstance(prods, list) else [prods])
    
    db.session.commit()
    return jsonify(p.to_dict())

@app.route("/api/processing-plants/<plant_id>", methods=["DELETE"])
@login_required
def delete_plant(plant_id):
    uid = request.current_user.id
    p = ProcessingPlant.query.filter_by(id=plant_id, user_id=uid).first()
    if not p:
        return jsonify({"error": "Processing plant not found"}), 404
    db.session.delete(p)
    db.session.commit()
    return jsonify({"success": True, "message": f"Processing plant {plant_id} deleted successfully"})


# ── Distributors (User-Isolated) ───────────────────────

@app.route("/api/distributors", methods=["GET"])
@login_required
def get_distributors():
    uid = request.current_user.id
    distributors = Distributor.query.filter_by(user_id=uid).order_by(Distributor.id.asc()).all()
    return jsonify({"distributors": [d.to_dict() for d in distributors]})

@app.route("/api/distributors/<distributor_id>", methods=["GET"])
@login_required
def get_distributor(distributor_id):
    uid = request.current_user.id
    d = Distributor.query.filter_by(id=distributor_id, user_id=uid).first()
    if not d:
        return jsonify({"error": "Distributor not found"}), 404
    return jsonify(d.to_dict())

@app.route("/api/distributors", methods=["POST"])
@login_required
def create_distributor():
    uid = request.current_user.id
    data = request.get_json() or {}
    if not data.get("name") or not data.get("region"):
        return jsonify({"error": "Fields 'name' and 'region' are required"}), 400
    
    did = data.get("id")
    if not did:
        count = Distributor.query.filter_by(user_id=uid).count() + 1
        did = f"D{count:02d}"
        while Distributor.query.get(did):
            count += 1
            did = f"D{count:02d}"

    d = Distributor(
        id=did,
        user_id=uid,
        name=data["name"].strip(),
        region=data["region"].strip(),
        delivery_routes=int(data.get("delivery_routes", 10)),
        vehicles=int(data.get("vehicles", 5)),
        on_time_pct=float(data.get("on_time_pct", 92.0)),
        is_seed=False
    )
    db.session.add(d)
    db.session.commit()
    return jsonify(d.to_dict()), 201

@app.route("/api/distributors/<distributor_id>", methods=["PUT", "PATCH"])
@login_required
def update_distributor(distributor_id):
    uid = request.current_user.id
    d = Distributor.query.filter_by(id=distributor_id, user_id=uid).first()
    if not d:
        return jsonify({"error": "Distributor not found"}), 404
    
    data = request.get_json() or {}
    if "name" in data: d.name = data["name"].strip()
    if "region" in data: d.region = data["region"].strip()
    if "delivery_routes" in data: d.delivery_routes = int(data["delivery_routes"])
    if "vehicles" in data: d.vehicles = int(data["vehicles"])
    if "on_time_pct" in data: d.on_time_pct = float(data["on_time_pct"])

    db.session.commit()
    return jsonify(d.to_dict())

@app.route("/api/distributors/<distributor_id>", methods=["DELETE"])
@login_required
def delete_distributor(distributor_id):
    uid = request.current_user.id
    d = Distributor.query.filter_by(id=distributor_id, user_id=uid).first()
    if not d:
        return jsonify({"error": "Distributor not found"}), 404
    db.session.delete(d)
    db.session.commit()
    return jsonify({"success": True, "message": f"Distributor {distributor_id} deleted successfully"})


# ── Retailers (User-Isolated) ──────────────────────────

@app.route("/api/retailers", methods=["GET"])
@login_required
def get_retailers():
    uid = request.current_user.id
    retailers = Retailer.query.filter_by(user_id=uid).order_by(Retailer.id.asc()).all()
    return jsonify({"retailers": [r.to_dict() for r in retailers]})

@app.route("/api/retailers/<retailer_id>", methods=["GET"])
@login_required
def get_retailer(retailer_id):
    uid = request.current_user.id
    r = Retailer.query.filter_by(id=retailer_id, user_id=uid).first()
    if not r:
        return jsonify({"error": "Retailer not found"}), 404
    return jsonify(r.to_dict())

@app.route("/api/retailers", methods=["POST"])
@login_required
def create_retailer():
    uid = request.current_user.id
    data = request.get_json() or {}
    if not data.get("name") or not data.get("city"):
        return jsonify({"error": "Fields 'name' and 'city' are required"}), 400
    
    rid = data.get("id")
    if not rid:
        count = Retailer.query.filter_by(user_id=uid).count() + 1
        rid = f"R{count:03d}"
        while Retailer.query.get(rid):
            count += 1
            rid = f"R{count:03d}"

    r = Retailer(
        id=rid,
        user_id=uid,
        name=data["name"].strip(),
        type=data.get("type", "Retailer").strip(),
        city=data["city"].strip(),
        monthly_demand_liters=float(data.get("monthly_demand_liters", 20000.0)),
        current_stock_liters=float(data.get("current_stock_liters", 2000.0)),
        lat=float(data.get("lat", 20.0)),
        lng=float(data.get("lng", 77.0)),
        is_seed=False
    )
    db.session.add(r)
    db.session.commit()
    return jsonify(r.to_dict()), 201

@app.route("/api/retailers/<retailer_id>", methods=["PUT", "PATCH"])
@login_required
def update_retailer(retailer_id):
    uid = request.current_user.id
    r = Retailer.query.filter_by(id=retailer_id, user_id=uid).first()
    if not r:
        return jsonify({"error": "Retailer not found"}), 404
    
    data = request.get_json() or {}
    if "name" in data: r.name = data["name"].strip()
    if "type" in data: r.type = data["type"].strip()
    if "city" in data: r.city = data["city"].strip()
    if "monthly_demand_liters" in data: r.monthly_demand_liters = float(data["monthly_demand_liters"])
    if "current_stock_liters" in data: r.current_stock_liters = float(data["current_stock_liters"])

    db.session.commit()
    return jsonify(r.to_dict())

@app.route("/api/retailers/<retailer_id>", methods=["DELETE"])
@login_required
def delete_retailer(retailer_id):
    uid = request.current_user.id
    r = Retailer.query.filter_by(id=retailer_id, user_id=uid).first()
    if not r:
        return jsonify({"error": "Retailer not found"}), 404
    db.session.delete(r)
    db.session.commit()
    return jsonify({"success": True, "message": f"Retailer {retailer_id} deleted successfully"})


# ── Milk Collection & Workflows (User-Isolated) ────────

@app.route("/api/collections", methods=["GET", "POST"])
@login_required
def handle_collections():
    uid = request.current_user.id
    if request.method == "POST":
        data = request.get_json() or {}
        farmer_id = data.get("farmer_id")
        center_id = data.get("center_id")
        quantity = float(data.get("quantity_liters", 0.0))
        fat = float(data.get("fat_pct", 4.2))
        snf = float(data.get("snf_pct", 8.5))
        quality = float(data.get("quality_score", 92.0))

        if not farmer_id or not center_id or quantity <= 0:
            return jsonify({"error": "farmer_id, center_id and positive quantity_liters are required"}), 400

        farmer = Farmer.query.filter_by(id=farmer_id, user_id=uid).first()
        if not farmer:
            return jsonify({"error": f"Farmer {farmer_id} not found in your account"}), 404

        center = CollectionCenter.query.filter_by(id=center_id, user_id=uid).first()
        if not center:
            return jsonify({"error": f"Collection Center {center_id} not found in your account"}), 404

        coll = MilkCollection(
            user_id=uid,
            farmer_id=farmer_id,
            center_id=center_id,
            quantity_liters=quantity,
            fat_pct=fat,
            snf_pct=snf,
            quality_score=quality,
            collected_at=datetime.now(timezone.utc),
            is_seed=False
        )
        db.session.add(coll)

        center.current_stock += quantity
        farmer.daily_yield_liters = quantity
        farmer.quality_score = quality

        inv = InventoryTransaction(
            user_id=uid,
            transaction_type="collection_in",
            source_type="farmer",
            source_id=farmer_id,
            target_type="collection_center",
            target_id=center_id,
            quantity_liters=quantity,
            timestamp=datetime.now(timezone.utc),
            notes=f"Collection from {farmer.name} ({farmer_id})",
            is_seed=False
        )
        db.session.add(inv)

        q_test = QualityTest(
            user_id=uid,
            center_id=center_id,
            farmer_id=farmer_id,
            fat_pct=fat,
            snf_pct=snf,
            quality_score=quality,
            status="Passed" if quality >= 85.0 else "Warning",
            notes="Intake inspection",
            tested_at=datetime.now(timezone.utc),
            is_seed=False
        )
        db.session.add(q_test)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Milk collection successfully recorded and stock updated.",
            "collection": coll.to_dict(),
            "updated_center_stock": round(center.current_stock, 1)
        }), 201

    limit = int(request.args.get("limit", 50))
    collections = MilkCollection.query.filter_by(user_id=uid).order_by(MilkCollection.collected_at.desc()).limit(limit).all()
    return jsonify({"collections": [c.to_dict() for c in collections]})


@app.route("/api/inventory/transfer", methods=["POST"])
@login_required
def transfer_inventory():
    uid = request.current_user.id
    data = request.get_json() or {}
    center_id = data.get("center_id")
    plant_id = data.get("plant_id")
    quantity = float(data.get("quantity_liters", 0.0))

    if not center_id or not plant_id or quantity <= 0:
        return jsonify({"error": "center_id, plant_id, and positive quantity_liters are required"}), 400

    center = CollectionCenter.query.filter_by(id=center_id, user_id=uid).first()
    if not center:
        return jsonify({"error": f"Collection center {center_id} not found"}), 404

    plant = ProcessingPlant.query.filter_by(id=plant_id, user_id=uid).first()
    if not plant:
        return jsonify({"error": f"Processing plant {plant_id} not found"}), 404

    if center.current_stock < quantity:
        return jsonify({"error": f"Insufficient stock at {center.name}. Available: {center.current_stock} L"}), 400

    center.current_stock -= quantity
    
    inv = InventoryTransaction(
        user_id=uid,
        transaction_type="processing_transfer",
        source_type="collection_center",
        source_id=center_id,
        target_type="processing_plant",
        target_id=plant_id,
        quantity_liters=quantity,
        timestamp=datetime.now(timezone.utc),
        notes=f"Dispatch to {plant.name}",
        is_seed=False
    )
    db.session.add(inv)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Transferred {quantity} L from {center.name} to {plant.name}",
        "remaining_center_stock": round(center.current_stock, 1)
    })


@app.route("/api/inventory/transactions", methods=["GET"])
@login_required
def get_inventory_transactions():
    uid = request.current_user.id
    limit = int(request.args.get("limit", 50))
    transactions = InventoryTransaction.query.filter_by(user_id=uid).order_by(InventoryTransaction.timestamp.desc()).limit(limit).all()
    return jsonify({"transactions": [t.to_dict() for t in transactions]})


# ── AI Analytics APIs (User-Isolated) ──────────────────

@app.route("/api/ai/demand-forecast", methods=["GET"])
@login_required
def demand_forecast():
    return jsonify(compute_demand_forecast(user_id=request.current_user.id))

@app.route("/api/ai/route-optimization", methods=["GET"])
@login_required
def route_optimization():
    return jsonify(compute_route_optimization(user_id=request.current_user.id))

@app.route("/api/ai/quality-alerts", methods=["GET"])
@login_required
def quality_alerts():
    return jsonify(compute_quality_alerts(user_id=request.current_user.id))

@app.route("/api/ai/production-insights", methods=["GET"])
@login_required
def production_insights():
    return jsonify(compute_production_insights(user_id=request.current_user.id))

@app.route("/api/ai/supply-demand-balance", methods=["GET"])
@login_required
def supply_demand_balance():
    return jsonify(compute_supply_demand_balance(user_id=request.current_user.id))


# ── Main Entrypoint ────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print("=" * 60)
    print("  AI Dairy Cooperative Supply Chain Platform")
    print(f"  Single Localhost URL : http://localhost:{port}")
    print(f"  Database             : {get_database_uri()}")
    print(f"  Frontend Dist Path   : {FRONTEND_DIST}")
    print("=" * 60)
    app.run(debug=True, port=port)
