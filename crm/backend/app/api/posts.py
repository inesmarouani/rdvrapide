from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.db.session import get_db
from app.models.post import Post
from app.schemas.post import PostCreate, PostOut

router = APIRouter(prefix="/posts", tags=["posts"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[PostOut])
def list_posts(db: Session = Depends(get_db)):
    return db.query(Post).order_by(Post.date.desc()).all()


@router.post("", response_model=PostOut)
def create_post(post: PostCreate, db: Session = Depends(get_db)):
    db_post = Post(**post.model_dump())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@router.delete("/{post_id}")
def delete_post(post_id: str, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post introuvable")
    db.delete(post)
    db.commit()
    return {"ok": True}
