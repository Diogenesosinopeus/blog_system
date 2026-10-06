from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
import jwt
from datetime import datetime,timedelta,timezone
from app.core.config import settings
# 密码哈希
hasher=PasswordHasher()
def hash_password(password:str):
    hashed_password=hasher.hash(password)
    return hashed_password

def verify_password(password:str,hashed_password:str)->bool:

    try :
        return hasher.verify(hashed_password,password)
    except VerifyMismatchError:
        return False

# jwt token生成
def create_jwt_token(username:str)->str:
    expire=datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload={
        "sub":username,
        "exp":expire,
    }
    token=jwt.encode(payload,settings.SECRET_KEY,algorithm="HS256")
    return token

# token 检验
def decode_jwt_token (token:str)->None|str:
    try :
        decode_token = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return decode_token.get("sub")# 如果直接decode["sub"]会返回keyerror 而我希望他只返回username或是None
    except jwt.ExpiredSignatureError :
        return None
    except jwt.InvalidTokenError:
        return  None

