import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()

# Récupérer l'URL de la base de données. Par défaut, SQLite en local.
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./maquisia.db"

# Ajuster l'URL si elle provient de Supabase/Heroku et commence par 'postgres://'
# car SQLAlchemy requiert 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configuration de l'Engine SQLAlchemy selon le type de base de données
if DATABASE_URL.startswith("sqlite"):
    # SQLite nécessite cet argument pour autoriser plusieurs threads (utile en développement)
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Pour PostgreSQL / Supabase, pas besoin de check_same_thread
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dépendance pour l'injection de la session DB dans FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
