# from app.core.database import engine
# from sqlalchemy import text
#
# with engine.connect() as connection:
#     sel=text("SELECT 1")
#     result=connection.execute(sel)
#     print(result.fetchone())#打印第一行
#     print("-"*20)
#     print(result)

#
# from app.core.database import local_session_maker
# db_session = local_session_maker()
# print(db_session)
# db_session.close()




# 测测alembic是否加载了所有的model

from app.core.database import Base
from app.models.user import User
print(Base.metadata.tables.keys())
print(User.metadata.tables.keys())