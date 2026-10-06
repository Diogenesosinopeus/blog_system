from sqlalchemy.orm import  Session
from app.models.blog import Blog
from app.models.user import User
from app.schemas.blog import BlogRequest
from app.repo.blog import add_blog
from app.repo.blog import get_blog, get_blogs, update_blog, delete_blog
def create_blog(db:Session,user:User,blog:BlogRequest):
    current_blog=Blog()
    current_blog.content=blog.content
    current_blog.title=blog.title
    current_blog.author_id=user.id
    return add_blog(db,current_blog)

def list_blogs(db: Session):
    return get_blogs(db)

def read_blog(db: Session, blog_id: int):
    return get_blog(db, blog_id)

def edit_blog(db: Session, user: User, blog_id: int, request: BlogRequest):
    blog = get_blog(db, blog_id)
    if blog is None:
        return None, "not_found"
    if blog.author_id != user.id:
        return None, "forbidden"
    blog.title = request.title
    blog.content = request.content
    return update_blog(db, blog), None

def remove_blog(db: Session, user: User, blog_id: int):
    blog = get_blog(db, blog_id)
    if blog is None:
        return None, "not_found"
    if blog.author_id != user.id:
        return None, "forbidden"
    delete_blog(db, blog)
    return blog, None
