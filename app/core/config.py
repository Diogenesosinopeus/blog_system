# import os
# from datetime import timedelta
# from dotenv import load_dotenv
# # 载入env文件（自动从项目根目录查找）
# load_dotenv()
# # pgsql数据库url
# database_url = os.getenv('DATABASE_URL')
#
# # jwt
# SECRET_KEY=os.getenv('SECRET_KEY')
# # JWT_EXPIRE_MINUTES =timedelta(0,60*int(os.getenv("JWT_EXPIRE_MINUTES","30")))#因为timedelta第一个数据是day不符合我们的minutes所以乘60弥补
# JWT_EXPIRATION_DELTA=timedelta(minutes=int(os.getenv("JWT_EXPIRE_MINUTES")))#可以直接标识
# # debug
# def yon(a:str)->bool:
#     a=a.lower()
#     if a=="true":
#         return True
#     else:
#         return False
# DEBUG=yon(a=os.getenv("DEBUG"))
from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    model_config=SettingsConfigDict(env_file=".env",env_file_encoding="utf-8")
    DATABASE_URL: str
    SECRET_KEY: str
    JWT_EXPIRE_MINUTES: int
    DEBUG: bool
settings = Settings()
