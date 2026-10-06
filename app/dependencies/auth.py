from fastapi.security import OAuth2PasswordBearer
from fastapi import  Depends,HTTPException
from app.core.security import decode_jwt_token
from sqlalchemy.orm import  Session
from app.repo.user import  get_username
from app.core.database import get_db
# 检验token与username是否匹配
get_token_schema= OAuth2PasswordBearer(tokenUrl="/login")
def get_current_user(db:Session=Depends(get_db), token:str= Depends(get_token_schema)):
    got_username=decode_jwt_token(token)
    if got_username is None:
        raise  HTTPException(status_code=401,detail="token过期或造假")
    user=get_username(db,got_username)

    if user is None:
        raise HTTPException(status_code=401,detail="用户不存在")

    return user


