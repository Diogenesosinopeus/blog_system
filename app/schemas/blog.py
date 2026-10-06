from pydantic import BaseModel,ConfigDict,Field
from datetime import  datetime
class BlogResponse (BaseModel):
    model_config = ConfigDict(from_attributes=True)
    author_id: int
    id: int
    title:str
    content:str
    updated_at:datetime
    created_at:datetime

class BlogRequest(BaseModel):

    content:str=Field(min_length=1)
    title:str=Field(min_length=1)
    