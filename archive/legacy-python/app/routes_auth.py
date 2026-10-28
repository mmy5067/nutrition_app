# app/routes_auth.py
from __future__ import annotations
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy import select
from . import db
from .models import User, Invite

bp = Blueprint("auth", __name__)

@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    code = (data.get("invite_code") or "").strip()

    if not email or not password or not code:
        return jsonify({"ok": False, "error": "email/password/invite_code required"}), 400

    # 校验邀请码
    inv = db.session.execute(select(Invite).where(Invite.code == code)).scalar_one_or_none()
    if inv is None or inv.used_by is not None:
        return jsonify({"ok": False, "error": "invalid or used invite_code"}), 400

    # 重复邮箱检查
    exists = db.session.execute(select(User.id).where(User.email == email)).scalar_one_or_none()
    if exists:
        return jsonify({"ok": False, "error": "email already registered"}), 409

    # 创建用户
    u = User(email=email, password_hash="")
    u.set_password(password)
    db.session.add(u)
    db.session.flush()  # 先获得 u.id

    # 占用邀请码
    inv.used_by = u.id
    from datetime import datetime
    inv.used_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"ok": True, "user_id": u.id})

@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"ok": False, "error": "email/password required"}), 400

    u = db.session.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not u or not u.check_password(password):
        return jsonify({"ok": False, "error": "invalid credentials"}), 401
    if not u.is_active:
        return jsonify({"ok": False, "error": "user inactive"}), 403

    login_user(u, remember=True)
    return jsonify({"ok": True, "user_id": u.id})

@bp.post("/logout")
@login_required
def logout():
    logout_user()
    return jsonify({"ok": True})

@bp.get("/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"authenticated": False})
    return jsonify({"authenticated": True, "email": current_user.email, "user_id": current_user.id})
