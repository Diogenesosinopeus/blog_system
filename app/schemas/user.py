from pydantic import BaseModel,ConfigDict
class UserResponse(BaseModel):
    model_config =  ConfigDict(from_attributes=True  )# 开启对orm对象的读写能力
    username: str

