from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def get_database_uri():
    """
    Returns the database URI configured via environment variable DATABASE_URL,
    defaulting to a persistent local SQLite database in the project directory.
    """
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url
    
    # Default to sqlite:///dairyscm.db in the project root
    base_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(base_dir, "dairyscm.db")
    return f"sqlite:///{db_path}"
