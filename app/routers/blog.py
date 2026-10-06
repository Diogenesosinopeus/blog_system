from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import  Session
from app.core.database import get_db
from app.schemas.blog import BlogRequest,BlogResponse
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.services.blog import create_blog, list_blogs, read_blog, edit_blog, remove_blog
router =APIRouter()

@router.post("/blogs",response_model=BlogResponse)
def create_blog_now(request:BlogRequest,user:User=Depends(get_current_user),db:Session=Depends(get_db)):
    blog=create_blog(db,user,request)
    return blog

@router.get("/blogs", response_model=list[BlogResponse])
def get_blog_list(db: Session = Depends(get_db)):
    return list_blogs(db)

@router.get("/blogs/{blog_id}", response_model=BlogResponse)
def get_blog_detail(blog_id: int, db: Session = Depends(get_db)):
    blog = read_blog(db, blog_id)
    if blog is None:
        raise HTTPException(status_code=404, detail="Blog not found")
    return blog

@router.put("/blogs/{blog_id}", response_model=BlogResponse)
def update_blog_now(
    blog_id: int,
    request: BlogRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    blog, error = edit_blog(db, user, blog_id, request)
    if error == "not_found":
        raise HTTPException(status_code=404, detail="Blog not found")
    if error == "forbidden":
        raise HTTPException(status_code=403, detail="You cannot edit this blog")
    return blog

@router.delete("/blogs/{blog_id}", status_code=204)
def delete_blog_now(
    blog_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, error = remove_blog(db, user, blog_id)#第一个返回值不需要，随意赋值即可
    if error == "not_found":
        raise HTTPException(status_code=404, detail="Blog not found")
    if error == "forbidden":
        raise HTTPException(status_code=403, detail="You cannot delete this blog")
