from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.db.session import get_db
from app.models.event import Event
from app.schemas.event import EventCreate, EventOut

router = APIRouter(prefix="/events", tags=["events"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[EventOut])
def list_events(db: Session = Depends(get_db)):
    return db.query(Event).order_by(Event.date.desc()).all()


@router.post("", response_model=EventOut)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = Event(**event.model_dump())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.delete("/{event_id}")
def delete_event(event_id: str, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(404, "Événement introuvable")
    db.delete(event)
    db.commit()
    return {"ok": True}
