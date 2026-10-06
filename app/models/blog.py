from app.core.database import Base
from sqlalchemy.orm import mapped_column, Mapped
from sqlalchemy import String,Text,Integer,ForeignKey,DateTime
from datetime import datetime,timezone

class Blog(Base):
    __tablename__ = "blogs"
    id:Mapped[int]=mapped_column(primary_key=True)
    title:Mapped[str]=mapped_column(String(255),nullable=False,unique=False)
    content:Mapped[str]=mapped_column(Text,nullable=False,unique=False)
    author_id:Mapped[int]=mapped_column(Integer,ForeignKey("users.id"), nullable=False ,unique=False,index=True)
    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=False,unique=False,default=lambda :datetime.now(timezone.utc))# datetime.now(timezone,utc)保存时区，但Datetime默认不保存所以要注明
    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=False,unique=False,default=lambda :datetime.now(timezone.utc),onupdate=lambda :datetime.now(timezone.utc))#lambda定义一个“需要时执行的”函数
