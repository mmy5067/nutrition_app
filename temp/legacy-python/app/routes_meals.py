# app/routes_meals.py
from __future__ import annotations
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import select, func
from . import db
from .models import Meal, MealItem

bp = Blueprint("meals", __name__)

def _parse_iso8601(dt_str: str) -> datetime:
    # 简单处理：支持 "2025-11-07T12:30:00" 或 "2025-11-07 12:30:00"
    return datetime.fromisoformat(dt_str.replace(" ", "T"))

@bp.post("/")
@login_required
def create_meal():
    """
    创建一顿饭及其条目
    body 示例：
    {
      "eaten_at": "2025-11-07T12:30:00",
      "meal_type": "lunch",
      "note": "中午简餐",
      "items": [
        {"name":"鸡胸肉","quantity":150,"unit":"g","calories":165,"protein":31,"fat":3.5,"carbs":0},
        {"name":"米饭","quantity":200,"unit":"g","calories":232,"carbs":51}
      ]
    }
    """
    data = request.get_json(silent=True) or {}
    eaten_at = data.get("eaten_at")
    if not eaten_at:
        return jsonify({"ok": False, "error": "eaten_at required"}), 400

    try:
        eaten_at_dt = _parse_iso8601(eaten_at)
    except Exception:
        return jsonify({"ok": False, "error": "invalid eaten_at format"}), 400

    meal = Meal(
        user_id=current_user.id,
        eaten_at=eaten_at_dt,
        meal_type=data.get("meal_type"),
        note=data.get("note"),
    )
    db.session.add(meal)

    items = data.get("items") or []
    for it in items:
        item = MealItem(
            meal=meal,
            name=(it.get("name") or "").strip() or "未命名",
            quantity=it.get("quantity"),
            unit=it.get("unit"),
            calories=it.get("calories"),
            protein=it.get("protein"),
            fat=it.get("fat"),
            carbs=it.get("carbs"),
            extra=it.get("extra"),
        )
        db.session.add(item)

    db.session.commit()

    return jsonify({"ok": True, "meal_id": meal.id})

@bp.get("/day")
@login_required
def list_meals_by_day():
    """
    按天获取自己的所有餐次 + 条目
    GET /api/meals/day?date=2025-11-07
    """
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"ok": False, "error": "date required"}), 400

    try:
        d = date.fromisoformat(date_str)
    except Exception:
        return jsonify({"ok": False, "error": "invalid date"}), 400

    start = datetime(d.year, d.month, d.day)
    end = datetime(d.year, d.month, d.day, 23, 59, 59, 999999)

    result = db.session.execute(
        select(Meal)
        .where(
            Meal.user_id == current_user.id,
            Meal.eaten_at >= start,
            Meal.eaten_at <= end,
        )
        .order_by(Meal.eaten_at.asc())
    )

    q = result.unique().scalars().all()


    def serialize_meal(m: Meal):
        return {
            "id": m.id,
            "eaten_at": m.eaten_at.isoformat(),
            "meal_type": m.meal_type,
            "note": m.note,
            "items": [
                {
                    "id": it.id,
                    "name": it.name,
                    "quantity": float(it.quantity) if it.quantity is not None else None,
                    "unit": it.unit,
                    "calories": float(it.calories) if it.calories is not None else None,
                    "protein": float(it.protein) if it.protein is not None else None,
                    "fat": float(it.fat) if it.fat is not None else None,
                    "carbs": float(it.carbs) if it.carbs is not None else None,
                    "extra": it.extra,
                }
                for it in m.items
            ],
        }

    return jsonify({"ok": True, "date": date_str, "meals": [serialize_meal(m) for m in q]})

@bp.get("/summary")
@login_required
def summary_by_day():
    """
    某天的营养汇总（按 meal_items 求和）
    GET /api/meals/summary?date=2025-11-07
    """
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"ok": False, "error": "date required"}), 400

    try:
        d = date.fromisoformat(date_str)
    except Exception:
        return jsonify({"ok": False, "error": "invalid date"}), 400

    start = datetime(d.year, d.month, d.day)
    end = datetime(d.year, d.month, d.day, 23, 59, 59, 999999)

    row = db.session.execute(
        select(
            func.coalesce(func.sum(MealItem.calories), 0),
            func.coalesce(func.sum(MealItem.protein), 0),
            func.coalesce(func.sum(MealItem.fat), 0),
            func.coalesce(func.sum(MealItem.carbs), 0),
        )
        .join(Meal, MealItem.meal_id == Meal.id)
        .where(
            Meal.user_id == current_user.id,
            Meal.eaten_at >= start,
            Meal.eaten_at <= end,
        )
    ).one()

    return jsonify({
        "ok": True,
        "date": date_str,
        "total_calories": float(row[0]),
        "total_protein": float(row[1]),
        "total_fat": float(row[2]),
        "total_carbs": float(row[3]),
    })

@bp.delete("/<int:meal_id>")
@login_required
def delete_meal(meal_id: int):
    """
    删除一顿餐（及其条目），只能删自己的
    """
    result = db.session.execute(
        select(Meal).where(
            Meal.id == meal_id,
            Meal.user_id == current_user.id,
        )
    )
    m = result.unique().scalars().one_or_none()
    if not m:
        return jsonify({"ok": False, "error": "meal not found"}), 404

    db.session.delete(m)
    db.session.commit()
    return jsonify({"ok": True})

