from pydantic import BaseModel,Field
class RegisterRequest(BaseModel):
    username:str =Field(min_length=1,max_length=50)
    password:str =Field(min_length=1,max_length=64)
    email:str =Field(min_length=1,max_length=255)

class LoginRequest(BaseModel):
    username: str = Field(min_length=1,max_length=50)
    password: str = Field(min_length=1,max_length=64)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str="bearer"