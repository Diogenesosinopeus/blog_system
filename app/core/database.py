from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import create_engine

class Base(DeclarativeBase):
    pass

engine = create_engine(settings.DATABASE_URL)
local_session_maker = sessionmaker(bind=engine)

def get_db():
    db = local_session_maker()
    try:

        yield db
    finally:
        db.close()
