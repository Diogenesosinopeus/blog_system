from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_jwt_token
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth import register, login


router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    result = register(
        db,
        request.username,
        request.password,
        request.email,
    )

    if result is not None:
        return result

    raise HTTPException(
        status_code=409,
        detail="Username already registered",
    )


@router.post("/login", response_model=TokenResponse, status_code=200)
def login_user(
    request: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = login(
        db,
        request.username,
        request.password,
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Username or password is incorrect",
        )

    token = create_jwt_token(user.username)

    return {
        "access_token": token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse, status_code=200)
def me(user: User = Depends(get_current_user)):
    return user