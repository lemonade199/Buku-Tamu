import os
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'backend', '.env'))

Base = declarative_base()

def get_database_url():
    # If DATABASE_URL is set in environment, use it
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url
    
    # Try PostgreSQL if credentials provided, else fallback to SQLite for local development
    db_host = os.getenv('DB_HOST')
    db_name = os.getenv('DB_NAME', 'buku_tamu')
    db_user = os.getenv('DB_USER')
    db_password = os.getenv('DB_PASSWORD')
    
    if db_host and db_user and db_password:
        return f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{os.getenv('DB_PORT', '5432')}/{db_name}"
    
    # SQLite local file path
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'buku_tamu.db')
    return f"sqlite:///{db_path}"

engine = None
SessionLocal = None

def init_db(database_url=None):
    global engine, SessionLocal
    url = database_url or get_database_url()
    
    engine_args = {}
    if url.startswith('sqlite'):
        engine_args['connect_args'] = {'check_same_thread': False}
    else:
        engine_args['pool_pre_ping'] = True
        engine_args['pool_recycle'] = 300
        
    engine = create_engine(url, **engine_args)
    SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    return engine, SessionLocal

def get_db_session():
    global SessionLocal
    if SessionLocal is None:
        init_db()
    return SessionLocal()
