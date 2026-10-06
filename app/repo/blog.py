from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.blog import Blog

def add_blog(db:Session,blog:Blog):
    db.add(blog)
    db.commit()
    db.refresh(blog)
    return blog

def get_blog(db: Session, blog_id: int):
    return db.execute(
        select(Blog).where(Blog.id == blog_id)
    ).scalar_one_or_none()

def get_blogs(db: Session):
    return db.execute(
        select(Blog).order_by(Blog.created_at.desc())
    ).scalars().all()

def update_blog(db: Session, blog: Blog):
    db.commit()
    db.refresh(blog)
    return blog

def delete_blog(db: Session, blog: Blog):
    db.delete(blog)
    db.commit()


