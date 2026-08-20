import os
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify

SECRET_KEY = os.getenv("SECRET_KEY", "dairy-scm-production-secret-key-2026")
ALGORITHM = "HS256"
TOKEN_EXPIRATION_DAYS = 7

def generate_token(user_id):
    """Generate a signed JWT token for a given user ID."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=TOKEN_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token):
    """Decode and validate a JWT token, returning the integer user ID."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except Exception:
        return None

def login_required(f):
    """
    Decorator for Flask routes requiring user authentication.
    Extracts Bearer token from Authorization header or cookie, verifies user,
    and sets request.current_user.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from models import User
        auth_header = request.headers.get("Authorization", "")
        token = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        elif request.cookies.get("token"):
            token = request.cookies.get("token")

        if not token:
            return jsonify({
                "error": "Unauthorized",
                "message": "Authentication token missing. Please log in."
            }), 401

        user_id = decode_token(token)
        if not user_id:
            return jsonify({
                "error": "Unauthorized",
                "message": "Invalid or expired token. Please log in again."
            }), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "error": "Unauthorized",
                "message": "User account not found."
            }), 401

        request.current_user = user
        return f(*args, **kwargs)
    return decorated_function
