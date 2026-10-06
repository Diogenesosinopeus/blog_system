from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.user import User
def get_username(db:Session,username:str):
    # SELECT：根据 username 查询用户
    # 返回 User | None

    stmt=select(User).where(User.username==username)
    result=db.execute(stmt)
    user=result.scalar_one_or_none()
    return user# 返回userORM对象

def add_user(db:Session , user:User):
    # INSERT：保存 User
    # 返回保存后的 User
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

