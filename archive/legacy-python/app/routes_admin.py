# app/routes_admin.py
from datetime import datetime, timedelta

from flask import Blueprint, render_template, jsonify, request, abort, current_app
from flask_login import login_required, current_user
from sqlalchemy import func, or_

from . import db
from .models import User, Meal, Invite  # 确保有 Invite 模型

bp = Blueprint("admin", __name__, url_prefix="/admin")


def admin_required(view):
    """
    仅允许 is_admin 用户访问；否则直接 404。
    """
    from functools import wraps

    @wraps(view)
    def wrapped(*args, **kwargs):
        if not current_user.is_authenticated or not getattr(current_user, "is_admin", False):
            abort(404)
        return view(*args, **kwargs)

    return wrapped


@bp.get("/")
@login_required
@admin_required
def dashboard():
    """
    管理面板页面（HTML）
    """
    # 基本统计
    now = datetime.now()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    total_users = db.session.query(func.count(User.id)).scalar() or 0
    active_users_7d = (
        db.session.query(func.count(func.distinct(Meal.user_id)))
        .filter(Meal.eaten_at >= week_ago)
        .scalar()
        or 0
    )
    total_meals = db.session.query(func.count(Meal.id)).scalar() or 0
    meals_24h = (
        db.session.query(func.count(Meal.id))
        .filter(Meal.eaten_at >= day_ago)
        .scalar()
        or 0
    )

    # 最近用户 & 最近餐食
    latest_users = (
        db.session.query(User)
        .order_by(User.created_at.desc())
        .limit(20)
        .all()
    )
    latest_meals = (
        db.session.query(Meal)
        .order_by(Meal.eaten_at.desc())
        .limit(30)
        .all()
    )

    # 简单服务状态（应用维度）
    started_at = current_app.config.get("STARTED_AT")
    uptime = None
    if started_at:
        delta = now - started_at
        uptime = f"{delta.days}d {delta.seconds//3600:02d}:{(delta.seconds//60)%60:02d}"

    return render_template(
        "admin.html",
        now=now,
        total_users=total_users,
        active_users_7d=active_users_7d,
        total_meals=total_meals,
        meals_24h=meals_24h,
        latest_users=latest_users,
        latest_meals=latest_meals,
        uptime=uptime,
    )


@bp.get("/api/summary")
@login_required
@admin_required
def api_summary():
    """
    返回 JSON 概览，前端也可以按需刷新用。
    """
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    total_users = db.session.query(func.count(User.id)).scalar() or 0
    active_users_7d = (
        db.session.query(func.count(func.distinct(Meal.user_id)))
        .filter(Meal.eaten_at >= week_ago)
        .scalar()
        or 0
    )
    total_meals = db.session.query(func.count(Meal.id)).scalar() or 0
    meals_24h = (
        db.session.query(func.count(Meal.id))
        .filter(Meal.eaten_at >= day_ago)
        .scalar()
        or 0
    )

    return jsonify({
        "ok": True,
        "total_users": total_users,
        "active_users_7d": active_users_7d,
        "total_meals": total_meals,
        "meals_24h": meals_24h,
    })


@bp.get("/api/users")
@login_required
@admin_required
def api_users():
    """
    简单用户列表，仅给你自己看。
    """
    users = (
        db.session.query(User)
        .order_by(User.created_at.desc())
        .limit(200)
        .all()
    )
    data = []
    for u in users:
        data.append({
            "id": u.id,
            "email": u.email,
            "is_admin": bool(u.is_admin),
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if getattr(u, "last_login_at", None) else None,
        })
    return jsonify({"ok": True, "users": data})


@bp.post("/api/users/<int:user_id>/delete")
@login_required
@admin_required
def api_delete_user(user_id: int):
    """
    删除用户 + 作废关联邀请码。用于封号或清理测试账号。
    """
    if user_id == current_user.id:
        return jsonify({"ok": False, "error": "不能删除自己"}), 400

    u = db.session.get(User, user_id)
    if not u:
        return jsonify({"ok": False, "error": "用户不存在"}), 404

    # 删除与该用户关联的邀请码（被他使用的或为他生成的）
    invites = db.session.query(Invite).filter(
        or_(
            Invite.used_by == user_id,
            getattr(Invite, "created_by", None) == user_id,  # 如果有 created_by 字段
        )
    ).all()
    for inv in invites:
        db.session.delete(inv)

    db.session.delete(u)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/api/invites/generate")
@login_required
@admin_required
def api_generate_invite():
    """
    后台生成新邀请码，返回给你手动发给内测用户。
    """
    import secrets
    code = secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12]
    current_app.logger.warning("admin_required: auth=%s, is_admin=%s",
                           current_user.is_authenticated,
                           getattr(current_user, "is_admin", None))
    inv = Invite(code=code)
    db.session.add(inv)
    db.session.commit()
    return jsonify({"ok": True, "code": code, "id": inv.id})


@bp.post("/api/invites/<int:invite_id>/delete")
@login_required
@admin_required
def api_delete_invite(invite_id: int):
    inv = db.session.get(Invite, invite_id)
    if not inv:
        return jsonify({"ok": False, "error": "邀请码不存在"}), 404
    db.session.delete(inv)
    db.session.commit()
    return jsonify({"ok": True})

