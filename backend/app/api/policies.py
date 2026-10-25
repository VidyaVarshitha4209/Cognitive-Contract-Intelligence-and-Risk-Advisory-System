from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_optional_user
from app.models.user import User
from app.models.policy import Policy
from app.schemas.policy import PolicyCreate, PolicyUpdate, PolicyOut
from app.services.policy_service import seed_default_policies, DEFAULT_POLICIES

router = APIRouter(prefix="/policies", tags=["Company Policies"])

@router.get("", response_model=List[PolicyOut])
def list_policies(db: Session = Depends(get_db), current_user: User = Depends(get_optional_user)):
    seed_default_policies(db)
    policies = db.query(Policy).order_by(Policy.created_at.desc()).all()
    return [PolicyOut.model_validate(p) for p in policies]

@router.post("", response_model=PolicyOut)
def create_policy(
    policy_in: PolicyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = Policy(**policy_in.model_dump())
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return PolicyOut.model_validate(policy)

@router.get("/{policy_id}", response_model=PolicyOut)
def get_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")
    return PolicyOut.model_validate(policy)

@router.put("/{policy_id}", response_model=PolicyOut)
def update_policy(
    policy_id: str,
    policy_in: PolicyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")

    update_data = policy_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(policy, field, val)

    db.commit()
    db.refresh(policy)
    return PolicyOut.model_validate(policy)

@router.delete("/{policy_id}")
def delete_policy(
    policy_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")
    db.delete(policy)
    db.commit()
    return {"message": "Policy deleted successfully."}

@router.post("/reset-defaults", response_model=List[PolicyOut])
def reset_default_policies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Policy).delete()
    db.commit()
    seed_default_policies(db)
    policies = db.query(Policy).all()
    return [PolicyOut.model_validate(p) for p in policies]
