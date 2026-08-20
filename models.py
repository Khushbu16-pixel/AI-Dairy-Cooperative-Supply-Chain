from datetime import datetime, timezone
import json
from werkzeug.security import generate_password_hash, check_password_hash
from database import db

def utc_now():
    return datetime.now(timezone.utc)

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    organization_name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(32), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    farmers = db.relationship('Farmer', backref='owner', lazy=True, cascade="all, delete-orphan")
    collection_centers = db.relationship('CollectionCenter', backref='owner', lazy=True, cascade="all, delete-orphan")
    processing_plants = db.relationship('ProcessingPlant', backref='owner', lazy=True, cascade="all, delete-orphan")
    distributors = db.relationship('Distributor', backref='owner', lazy=True, cascade="all, delete-orphan")
    retailers = db.relationship('Retailer', backref='owner', lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "organization_name": self.organization_name,
            "location": self.location,
            "phone": self.phone or "",
            "created_at": self.created_at.isoformat()
        }


class Farmer(db.Model):
    __tablename__ = 'farmers'

    id = db.Column(db.String(32), primary_key=True)  # e.g., "F001"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    village = db.Column(db.String(120), nullable=False)
    cows = db.Column(db.Integer, default=0, nullable=False)
    daily_yield_liters = db.Column(db.Float, default=0.0, nullable=False)
    quality_score = db.Column(db.Float, default=90.0, nullable=False)
    lat = db.Column(db.Float, default=0.0, nullable=False)
    lng = db.Column(db.Float, default=0.0, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    collections = db.relationship('MilkCollection', backref='farmer', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "village": self.village,
            "cows": self.cows,
            "daily_yield_liters": round(self.daily_yield_liters, 1),
            "quality_score": round(self.quality_score, 1),
            "lat": round(self.lat, 4),
            "lng": round(self.lng, 4)
        }


class CollectionCenter(db.Model):
    __tablename__ = 'collection_centers'

    id = db.Column(db.String(32), primary_key=True)  # e.g., "CC01"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    capacity_liters = db.Column(db.Float, default=5000.0, nullable=False)
    current_stock = db.Column(db.Float, default=0.0, nullable=False)
    temp_celsius = db.Column(db.Float, default=4.0, nullable=False)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    collections = db.relationship('MilkCollection', backref='collection_center', lazy=True)

    def to_dict(self):
        utilization = round((self.current_stock / self.capacity_liters * 100), 1) if self.capacity_liters > 0 else 0.0
        status = "Critical" if utilization > 85 else "Warning" if utilization > 70 else "Normal"
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "location": self.location,
            "capacity_liters": round(self.capacity_liters, 1),
            "current_stock": round(self.current_stock, 1),
            "temp_celsius": round(self.temp_celsius, 1),
            "utilization_pct": utilization,
            "status": status
        }


class ProcessingPlant(db.Model):
    __tablename__ = 'processing_plants'

    id = db.Column(db.String(32), primary_key=True)  # e.g., "PP01"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    location = db.Column(db.String(120), nullable=False)
    capacity_liters_per_day = db.Column(db.Float, default=100000.0, nullable=False)
    utilization_pct = db.Column(db.Float, default=80.0, nullable=False)
    products_json = db.Column(db.Text, default='["Milk"]', nullable=False)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    batches = db.relationship('ProcessingBatch', backref='plant', lazy=True)

    def to_dict(self):
        try:
            products = json.loads(self.products_json or '[]')
        except Exception:
            products = ["Milk"]
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "location": self.location,
            "capacity_liters_per_day": round(self.capacity_liters_per_day, 1),
            "utilization_pct": round(self.utilization_pct, 1),
            "products": products
        }


class Distributor(db.Model):
    __tablename__ = 'distributors'

    id = db.Column(db.String(32), primary_key=True)  # e.g., "D01"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    region = db.Column(db.String(120), nullable=False)
    delivery_routes = db.Column(db.Integer, default=10, nullable=False)
    vehicles = db.Column(db.Integer, default=5, nullable=False)
    on_time_pct = db.Column(db.Float, default=92.0, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    deliveries = db.relationship('DeliveryRecord', backref='distributor', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "region": self.region,
            "delivery_routes": self.delivery_routes,
            "vehicles": self.vehicles,
            "on_time_pct": round(self.on_time_pct, 1)
        }


class Retailer(db.Model):
    __tablename__ = 'retailers'

    id = db.Column(db.String(32), primary_key=True)  # e.g., "R001"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    name = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(64), nullable=False)  # "Supermarket", "Chain Store", "Retailer"
    city = db.Column(db.String(64), nullable=False)
    monthly_demand_liters = db.Column(db.Float, default=20000.0, nullable=False)
    current_stock_liters = db.Column(db.Float, default=2000.0, nullable=False)
    lat = db.Column(db.Float, nullable=True)
    lng = db.Column(db.Float, nullable=True)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    demand_records = db.relationship('RetailDemandRecord', backref='retailer', lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "type": self.type,
            "city": self.city,
            "monthly_demand_liters": round(self.monthly_demand_liters, 1),
            "current_stock_liters": round(self.current_stock_liters, 1)
        }


class MilkCollection(db.Model):
    __tablename__ = 'milk_collections'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    farmer_id = db.Column(db.String(32), db.ForeignKey('farmers.id'), nullable=False)
    center_id = db.Column(db.String(32), db.ForeignKey('collection_centers.id'), nullable=False)
    quantity_liters = db.Column(db.Float, nullable=False)
    fat_pct = db.Column(db.Float, default=4.2, nullable=False)
    snf_pct = db.Column(db.Float, default=8.5, nullable=False)
    quality_score = db.Column(db.Float, default=92.0, nullable=False)
    collected_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "farmer_id": self.farmer_id,
            "center_id": self.center_id,
            "quantity_liters": round(self.quantity_liters, 1),
            "fat_pct": round(self.fat_pct, 2),
            "snf_pct": round(self.snf_pct, 2),
            "quality_score": round(self.quality_score, 1),
            "collected_at": self.collected_at.isoformat(),
            "is_seed": self.is_seed
        }


class QualityTest(db.Model):
    __tablename__ = 'quality_tests'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    center_id = db.Column(db.String(32), db.ForeignKey('collection_centers.id'), nullable=True)
    farmer_id = db.Column(db.String(32), db.ForeignKey('farmers.id'), nullable=True)
    temp_celsius = db.Column(db.Float, nullable=True)
    fat_pct = db.Column(db.Float, nullable=True)
    snf_pct = db.Column(db.Float, nullable=True)
    quality_score = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(32), default="Passed", nullable=False)
    notes = db.Column(db.Text, nullable=True)
    tested_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "center_id": self.center_id,
            "farmer_id": self.farmer_id,
            "temp_celsius": self.temp_celsius,
            "fat_pct": self.fat_pct,
            "snf_pct": self.snf_pct,
            "quality_score": self.quality_score,
            "status": self.status,
            "notes": self.notes,
            "tested_at": self.tested_at.isoformat(),
            "is_seed": self.is_seed
        }


class InventoryTransaction(db.Model):
    __tablename__ = 'inventory_transactions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    transaction_type = db.Column(db.String(64), nullable=False)  # "collection_in", "processing_transfer", "retail_dispatch", "adjustment"
    source_type = db.Column(db.String(64), nullable=True)
    source_id = db.Column(db.String(64), nullable=True)
    target_type = db.Column(db.String(64), nullable=True)
    target_id = db.Column(db.String(64), nullable=True)
    quantity_liters = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=utc_now, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "transaction_type": self.transaction_type,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "quantity_liters": round(self.quantity_liters, 1),
            "timestamp": self.timestamp.isoformat(),
            "notes": self.notes,
            "is_seed": self.is_seed
        }


class ProcessingBatch(db.Model):
    __tablename__ = 'processing_batches'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    plant_id = db.Column(db.String(32), db.ForeignKey('processing_plants.id'), nullable=False)
    product_name = db.Column(db.String(64), nullable=False)
    input_milk_liters = db.Column(db.Float, nullable=False)
    output_quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(32), default="kg", nullable=False)
    status = db.Column(db.String(32), default="Completed", nullable=False)
    batch_date = db.Column(db.DateTime, default=utc_now, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plant_id": self.plant_id,
            "product_name": self.product_name,
            "input_milk_liters": round(self.input_milk_liters, 1),
            "output_quantity": round(self.output_quantity, 1),
            "unit": self.unit,
            "status": self.status,
            "batch_date": self.batch_date.isoformat(),
            "is_seed": self.is_seed
        }


class RetailDemandRecord(db.Model):
    __tablename__ = 'retail_demand_records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    retailer_id = db.Column(db.String(32), db.ForeignKey('retailers.id'), nullable=False)
    record_date = db.Column(db.Date, nullable=False)
    demand_liters = db.Column(db.Float, nullable=False)
    delivered_liters = db.Column(db.Float, default=0.0, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "retailer_id": self.retailer_id,
            "record_date": self.record_date.isoformat(),
            "demand_liters": round(self.demand_liters, 1),
            "delivered_liters": round(self.delivered_liters, 1),
            "is_seed": self.is_seed
        }


class DeliveryRecord(db.Model):
    __tablename__ = 'delivery_records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    distributor_id = db.Column(db.String(32), db.ForeignKey('distributors.id'), nullable=False)
    origin = db.Column(db.String(120), nullable=False)
    destination = db.Column(db.String(120), nullable=False)
    distance_km = db.Column(db.Float, nullable=False)
    fuel_liters = db.Column(db.Float, nullable=False)
    on_time = db.Column(db.Boolean, default=True, nullable=False)
    delivery_date = db.Column(db.DateTime, default=utc_now, nullable=False)
    is_seed = db.Column(db.Boolean, default=False, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "distributor_id": self.distributor_id,
            "origin": self.origin,
            "destination": self.destination,
            "distance_km": round(self.distance_km, 1),
            "fuel_liters": round(self.fuel_liters, 1),
            "on_time": self.on_time,
            "delivery_date": self.delivery_date.isoformat(),
            "is_seed": self.is_seed
        }
