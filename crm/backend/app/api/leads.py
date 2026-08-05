from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import require_auth
from app.db.session import get_db
from app.models.lead import Lead, LeadNote, LeadRelance
from app.schemas.lead import (
    LeadCreate,
    LeadNoteCreate,
    LeadNoteOut,
    LeadOut,
    LeadRelanceCreate,
    LeadRelanceOut,
    LeadUpdate,
)

router = APIRouter(tags=["leads"], dependencies=[Depends(require_auth)])


@router.get("/leads", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db)):
    return db.query(Lead).order_by(Lead.updated_at.desc()).all()


@router.post("/leads", response_model=LeadOut)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = Lead(**lead.model_dump())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead


@router.patch("/leads/{lead_id}", response_model=LeadOut)
def update_lead(lead_id: str, patch: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead introuvable")
    for k, v in patch.model_dump(exclude_unset=True).items():
        setattr(lead, k, v)
    db.commit()
    db.refresh(lead)
    return lead


@router.delete("/leads/{lead_id}")
def delete_lead(lead_id: str, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead introuvable")
    db.delete(lead)
    db.commit()
    return {"ok": True}


@router.post("/leads/{lead_id}/notes", response_model=LeadNoteOut)
def add_note(lead_id: str, note: LeadNoteCreate, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead introuvable")
    db_note = LeadNote(lead_id=lead_id, **note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.post("/leads/{lead_id}/relances", response_model=LeadRelanceOut)
def add_relance(lead_id: str, relance: LeadRelanceCreate, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead introuvable")
    db_relance = LeadRelance(lead_id=lead_id, **relance.model_dump())
    db.add(db_relance)
    db.commit()
    db.refresh(db_relance)
    return db_relance


@router.patch("/relances/{relance_id}/toggle")
def toggle_relance(relance_id: str, db: Session = Depends(get_db)):
    relance = db.get(LeadRelance, relance_id)
    if not relance:
        raise HTTPException(404, "Relance introuvable")
    relance.fait = not relance.fait
    db.commit()
    return {"ok": True, "fait": relance.fait}
