# app/routes_ai.py
from __future__ import annotations
import json
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import select, func
from . import db
from .models import Meal, MealItem, UserProfile, DaySummary
from .llm_client import chat, LLMError

bp = Blueprint("ai", __name__)

# 模型推断的餐别允许值白名单
_ALLOWED_MEAL_TYPES = {"早餐", "午餐", "晚餐", "夜宵", "加餐", "不确定"}

def _parse_iso(dt_str: str | None) -> datetime:
    if not dt_str:
        return datetime.now()
    return datetime.fromisoformat(dt_str.replace(" ", "T"))


def _safe_load_json(s: str):
    # 尽量从模型回复中抠出 JSON
    s = s.strip()
    try:
        return json.loads(s)
    except Exception:
        # 找到第一个 { 和最后一个 } 之间再试一次
        try:
            start = s.index("{")
            end = s.rindex("}") + 1
            return json.loads(s[start:end])
        except Exception:
            raise ValueError("无法从模型回复中解析出合法 JSON")


def _serialize_meal(meal: Meal):
    return {
        "id": meal.id,
        "eaten_at": meal.eaten_at.isoformat(),
        "meal_type": meal.meal_type,
        "note": meal.note,
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
            for it in meal.items
        ],
    }


@bp.post("/analyze_meal")
@login_required
def analyze_meal():
    """
    根据用户的自然语言描述，分析本顿餐的营养，并写入数据库。
    """
    data = request.get_json(silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "error": "text required"}), 400

    eaten_at = _parse_iso(data.get("eaten_at"))
    meal_type = data.get("meal_type") or None
    note = data.get("note") or None

    # 要求模型严格返回 JSON，增强非法输入检测 + 时间段/餐别推断
    system_prompt = (
        "你是营养师助手，负责根据用户的中文描述，估算一顿餐的大致营养构成。\n"
        "【重要】你的回答必须是合法 JSON，且不能包含任何 JSON 之外的文字。\n\n"

        "一、先判断输入是否合法：\n"
        "如果用户的描述明显不是在认真记录吃了什么，例如：\n"
        "  - 只是在聊天、发牢骚、开玩笑；\n"
        "  - 描述的是明显不能正常食用的东西（如：洗衣液、84消毒液、农药、花露水、机油、汽油等化学品）；\n"
        "  - 描述的是排泄物或脏话（如：屎、尿、狗屎、猫屎等），并非真正的食物；\n"
        "  - 含有严重侮辱、恶意攻击等内容，与记录饮食无关；\n"
        "则认为该输入“非法或离谱”，这时：\n"
        "  - 请返回 ok = false；\n"
        "  - 在 error 字段里用一句话说明原因，例如：\"描述中包含明显非食物或侮辱性内容\"；\n"
        "  - items 必须是空数组 []；\n"
        "  - comment 可以给空字符串 \"\"；\n"
        "  - meal_type_inferred 填 \"不确定\"。\n\n"

        "二、如果输入是正常的饮食记录，则 ok = true，并按要求估算营养：\n"
        "输出 JSON 的完整结构为：\n"
        "{\n"
        "  \"ok\": true 或 false,\n"
        "  \"error\": \"当 ok=false 时填写原因，否则用空字符串\",\n"
        "  \"items\": [\n"
        "    {\"name\": \"食物名\", \"quantity\": 数值或null, \"unit\": \"g/ml/份/个等\", "
        "     \"calories\": 数值或null, \"protein\": 数值或null, "
        "     \"fat\": 数值或null, \"carbs\": 数值或null}\n"
        "  ],\n"
        "  \"comment\": \"对这顿餐的简单评价，50字以内\",\n"
        "  \"meal_type_inferred\": \"早餐/午餐/晚餐/夜宵/加餐/不确定\" \n"
        "}\n\n"

        "三、营养估算要求：\n"
        "1) 尽量给出包括份量的合理估算；\n"
        "2) 实在没法估的字段用 null；\n"
        "3) 当 ok=true 时，items 至少要包含 1 项正常食物；\n\n"

        "四、用餐时间 / 餐别的推断（meal_type_inferred 字段）：\n"
        "你会在用户消息中看到：\n"
        "  - 文本里是否提到“早餐/早饭/早上/中午/午饭/午餐/晚饭/晚餐/夜宵/加餐”等；\n"
        "  - 后端传入的 eaten_at 时间（ISO 格式字符串）；\n"
        "  - 以及食物类型（例如：早上常见的牛奶、面包，夜宵常见的烧烤、炸鸡 + 啤酒等）。\n"
        "如果用户已经在描述或参数中明确说了是某一餐，请优先相信用户的描述；\n"
        "若未说明，则可结合 eaten_at 和食物内容大致推断：\n"
        "如果确实无法判断，则填“不确定”。\n\n"

        "【最后的要求】\n"
        " - 必须严格返回上述 JSON 结构；\n"
        " - 不要输出任何解释性文字、注释或多余内容；\n"
        " - 字段名必须完全一致：ok, error, items, comment, meal_type_inferred。\n"
    )

    # 把用户描述 + eaten_at + 外部 meal_type 一起喂给模型，方便它推断餐别
    user_prompt_lines = [
        f"用户描述这顿餐：{text}",
        f"后端收到的 eaten_at 参数（ISO 时间）：{eaten_at.isoformat(timespec='seconds')}",
        f"外部参数中传入的 meal_type（可能为空）：{meal_type or 'NULL'}",
        "请结合以上信息，按系统提示要求返回 JSON：",
    ]
    user_prompt = "\n".join(user_prompt_lines)

    try:
        raw = chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        parsed = _safe_load_json(raw)
    except (LLMError, ValueError) as e:
        return jsonify({"ok": False, "error": f"LLM解析失败: {e}"}), 500

    # 非法/离谱输入拦截：让模型用 ok=false + error 表示
    if parsed.get("ok") is False:
        return jsonify({
            "ok": False,
            "error": parsed.get("error") or "餐食描述包含非法或无效信息，请重新输入",
        }), 400

    items = parsed.get("items") or []
    if not isinstance(items, list) or not items:
        return jsonify({"ok": False, "error": "模型未返回有效 items"}), 500

    # 写入数据库
    meal = Meal(
        user_id=current_user.id,
        eaten_at=eaten_at,
        meal_type=meal_type,  # 优先使用前端传的
        note=note,
    )
    db.session.add(meal)

    # 如果前端没传 meal_type，则尝试用模型推断的补上（带白名单过滤）
    if not meal.meal_type:
        mt_inf = parsed.get("meal_type_inferred")
        if isinstance(mt_inf, str):
            mt_inf = mt_inf.strip()
            # 只接受白名单里的值，且一般不把“不确定”写入数据库
            if mt_inf in _ALLOWED_MEAL_TYPES and mt_inf != "不确定":
                meal.meal_type = mt_inf

    for it in items:
        name = (str(it.get("name") or "")).strip()
        if not name:
            continue
        mi = MealItem(
            meal=meal,
            name=name,
            quantity=it.get("quantity"),
            unit=it.get("unit") or None,
            calories=it.get("calories"),
            protein=it.get("protein"),
            fat=it.get("fat"),
            carbs=it.get("carbs"),
            extra={
                k: v
                for k, v in it.items()
                if k
                not in {
                    "name",
                    "quantity",
                    "unit",
                    "calories",
                    "protein",
                    "fat",
                    "carbs",
                }
            },
        )
        db.session.add(mi)

    db.session.commit()

    return jsonify(
        {
            "ok": True,
            "meal": _serialize_meal(meal),
            "comment": parsed.get("comment") or "",
            "raw": parsed,  # 看需要，前端调试期可以用；上线可去掉
        }
    )


@bp.get("/day_summary")
@login_required
def get_day_summary():
    """
    读取当天（或指定日期）的已生成总结，不存在则返回 exists=false。
    GET /api/ai/day_summary?date=YYYY-MM-DD
    """
    from datetime import date as date_cls

    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"ok": False, "error": "date required"}), 400
    try:
        d = date_cls.fromisoformat(date_str)
    except Exception:
        return jsonify({"ok": False, "error": "invalid date"}), 400

    ds = db.session.execute(
        select(DaySummary).where(
            DaySummary.user_id == current_user.id,
            DaySummary.date == d,
        )
    ).scalar_one_or_none()

    if not ds:
        return jsonify({"ok": True, "exists": False})

    return jsonify({
        "ok": True,
        "exists": True,
        "date": date_str,
        "summary": ds.summary,
        "totals": ds.totals,
    })


@bp.post("/day_summary")
@login_required
def generate_day_summary():
    """
    生成或覆盖某日总结（写入 day_summaries）。
    body: { "date": "YYYY-MM-DD" }，不传则默认今天。
    """
    from datetime import date as date_cls, datetime

    data = request.get_json(silent=True) or {}
    date_str = data.get("date")
    if not date_str:
        date_str = datetime.utcnow().date().isoformat()

    try:
        d = date_cls.fromisoformat(date_str)
    except Exception:
        return jsonify({"ok": False, "error": "invalid date"}), 400

    # 汇总营养
    start = datetime(d.year, d.month, d.day)
    end = datetime(d.year, d.month, d.day, 23, 59, 59, 999999)

    totals_row = db.session.execute(
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

    totals = {
        "calories": float(totals_row[0]),
        "protein": float(totals_row[1]),
        "fat": float(totals_row[2]),
        "carbs": float(totals_row[3]),
    }

    # 拉取当天全部餐食
    result = db.session.execute(
        select(Meal)
        .where(
            Meal.user_id == current_user.id,
            Meal.eaten_at >= start,
            Meal.eaten_at <= end,
        )
        .order_by(Meal.eaten_at.asc())
    )
    meals = result.unique().scalars().all()

    meals_data = []
    for m in meals:
        meals_data.append({
            "id": m.id,
            "eaten_at": m.eaten_at.isoformat() if m.eaten_at else None,
            "meal_type": m.meal_type,
            "note": m.note,
            "items": [
                {
                    "name": it.name,
                    "quantity": float(it.quantity) if it.quantity is not None else None,
                    "unit": it.unit,
                    "calories": float(it.calories) if it.calories is not None else None,
                    "protein": float(it.protein) if it.protein is not None else None,
                    "fat": float(it.fat) if it.fat is not None else None,
                    "carbs": float(it.carbs) if it.carbs is not None else None,
                }
                for it in m.items
            ],
        })

    # 没有餐就不给生成
    if not meals_data:
        return jsonify({"ok": False, "error": "no meals for this day"}), 400

    # 读取 profile
    prof = db.session.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    ).scalar_one_or_none()
    profile_data = {
        "height_cm": float(prof.height_cm) if prof and prof.height_cm is not None else None,
        "weight_kg": float(prof.weight_kg) if prof and prof.weight_kg is not None else None,
        "body_fat_pct": float(prof.body_fat_pct) if prof and prof.body_fat_pct is not None else None,
        "sex": prof.sex if prof else None,
    }

    system_prompt = (
        "你是一名严谨但温和的营养师。"
        "根据用户当天所有饮食记录 & 营养总量 & 身体数据，给出简明的每日总结："
        "1) 今天总体能量是否偏多/偏少；"
        "2) 蛋白质/脂肪/碳水是否大致合理；"
        "3) 结合身高体重体脂（如有）判断方向是否匹配（减脂/增肌/维持）；"
        "4) 给出明天 2-3 条具体可执行建议。"
        "简体中文，200 字内，语气友好。"
    )

    import json
    user_prompt = (
        f"日期: {date_str}\n"
        f"用户身体数据: {profile_data}\n"
        f"今日营养总量: {totals}\n"
        f"详细餐食数据: {json.dumps(meals_data, ensure_ascii=False)[:3500]}\n"
        "请生成总结："
    )

    try:
        text = chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=400,
            temperature=0.4,
        ).strip()
    except LLMError as e:
        return jsonify({"ok": False, "error": str(e)}), 500

    if not text:
        return jsonify({"ok": False, "error": "empty summary"}), 500

    # 写入或更新记录
    ds = db.session.execute(
        select(DaySummary).where(
            DaySummary.user_id == current_user.id,
            DaySummary.date == d,
        )
    ).scalar_one_or_none()
    if not ds:
        ds = DaySummary(
            user_id=current_user.id,
            date=d,
            summary=text,
            totals=totals,
        )
        db.session.add(ds)
    else:
        ds.summary = text
        ds.totals = totals

    db.session.commit()

    return jsonify({
        "ok": True,
        "date": date_str,
        "summary": text,
        "totals": totals,
    })
