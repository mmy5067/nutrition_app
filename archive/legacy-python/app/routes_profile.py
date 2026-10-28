# app/routes_profile.py
from __future__ import annotations
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import select
from . import db
from .models import UserProfile

bp = Blueprint("profile", __name__)

def _serialize(p: UserProfile | None):
    if not p:
        return {
            "height_cm": None,
            "weight_kg": None,
            "body_fat_pct": None,
            "birthday": None,
            "sex": None,
        }
    return {
        "height_cm": float(p.height_cm) if p.height_cm is not None else None,
        "weight_kg": float(p.weight_kg) if p.weight_kg is not None else None,
        "body_fat_pct": float(p.body_fat_pct) if p.body_fat_pct is not None else None,
        "birthday": p.birthday.isoformat() if p.birthday is not None else None,
        "sex": p.sex,
    }

@bp.get("/")
@login_required
def get_profile():
    p = db.session.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).scalar_one_or_none()
    return jsonify({"ok": True, "profile": _serialize(p)})

@bp.post("/")
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}
    p = db.session.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).scalar_one_or_none()
    if not p:
        p = UserProfile(user_id=current_user.id)
        db.session.add(p)

    # 只更新提供的字段
    if "height_cm" in data:
        p.height_cm = data["height_cm"] or None
    if "weight_kg" in data:
        p.weight_kg = data["weight_kg"] or None
    if "body_fat_pct" in data:
        p.body_fat_pct = data["body_fat_pct"] or None
    if "birthday" in data:
        from datetime import date
        p.birthday = date.fromisoformat(data["birthday"]) if data["birthday"] else None
    if "sex" in data:
        p.sex = (data["sex"] or "").strip() or None

    db.session.commit()
    return jsonify({"ok": True, "profile": _serialize(p)})
