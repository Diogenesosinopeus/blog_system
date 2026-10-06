from app.repo.user import get_username,add_user
from app.core.security import hash_password
from app.core.security import verify_password
from sqlalchemy.orm import Session
from app.models.user import User
def register(db:Session ,username:str,password:str,email:str):
    existing_user=get_username(db,username)
    if existing_user:
        return None
    password_hashed=hash_password(password)
    user=User()
    user.username=username
    user.password_hash=password_hashed
    user.email= email
    return add_user(db,user)

def login(db:Session,username:str,password:str):
    db_user=get_username(db,username)
    if db_user is None:
        return None

    if not verify_password(password,db_user.password_hash):
        return None
    return db_user
