from datetime import datetime
from . import db
from flask_login import UserMixin
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.dialects.postgresql import JSONB

class User(db.Model, UserMixin):
    __tablename__ = "users"
    id = db.Column(db.BigInteger, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    is_admin = db.Column(
        db.Boolean,
        nullable=False,
        server_default="false",
        default=False,
    )

    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)

    def set_password(self, raw: str) -> None:
        # 使用 PBKDF2-SHA256，Flask 官方推荐方案之一
        self.password_hash = generate_password_hash(raw, method="pbkdf2:sha256", salt_length=16)

    def check_password(self, raw: str) -> bool:
        return check_password_hash(self.password_hash, raw)



class Invite(db.Model):
    __tablename__ = "invites"
    id = db.Column(db.BigInteger, primary_key=True)
    code = db.Column(db.String(64), unique=True, nullable=False, index=True)
    used_by = db.Column(db.BigInteger, db.ForeignKey("users.id"), nullable=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)

class Meal(db.Model):
    __tablename__ = "meals"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(db.BigInteger, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    eaten_at = db.Column(db.DateTime(timezone=True), nullable=False, index=True)  # 吃这顿的时间
    meal_type = db.Column(db.String(32), nullable=True)  # breakfast / lunch / dinner / snack / other
    note = db.Column(db.Text, nullable=True)

    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = db.relationship("User", backref=db.backref("meals", lazy="dynamic", cascade="all, delete-orphan"))

class MealItem(db.Model):
    __tablename__ = "meal_items"

    id = db.Column(db.BigInteger, primary_key=True)
    meal_id = db.Column(db.BigInteger, db.ForeignKey("meals.id", ondelete="CASCADE"), nullable=False, index=True)

    name = db.Column(db.String(255), nullable=False)       # 食物名称
    quantity = db.Column(db.Numeric(10, 2), nullable=True) # 数量
    unit = db.Column(db.String(32), nullable=True)         # g, ml,份,个等

    # 基本营养（可选填，不强制）
    calories = db.Column(db.Numeric(10, 2), nullable=True)
    protein = db.Column(db.Numeric(10, 2), nullable=True)
    fat = db.Column(db.Numeric(10, 2), nullable=True)
    carbs = db.Column(db.Numeric(10, 2), nullable=True)

    # 可扩展字段：存模型返回的原始结构、品牌信息等（不破坏 schema）
    extra = db.Column(JSONB, nullable=True)

    meal = db.relationship("Meal", backref=db.backref("items", lazy="joined", cascade="all, delete-orphan"))

class UserProfile(db.Model):
    __tablename__ = "user_profiles"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    height_cm = db.Column(db.Numeric(5, 2), nullable=True)
    weight_kg = db.Column(db.Numeric(5, 2), nullable=True)
    body_fat_pct = db.Column(db.Numeric(5, 2), nullable=True)
    birthday = db.Column(db.Date, nullable=True)
    sex = db.Column(db.String(10), nullable=True)

    extra = db.Column(JSONB, nullable=True)
    updated_at = db.Column(
        db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user = db.relationship(
        "User",
        backref=db.backref(
            "profile",
            uselist=False,
            cascade="all, delete-orphan",
        ),
    )

class DaySummary(db.Model):
    __tablename__ = "day_summaries"

    id = db.Column(db.BigInteger, primary_key=True)
    user_id = db.Column(
        db.BigInteger,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date = db.Column(db.Date, nullable=False)
    summary = db.Column(db.Text, nullable=False)
    totals = db.Column(JSONB, nullable=True)

    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
    updated_at = db.Column(
        db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    __table_args__ = (
        db.UniqueConstraint("user_id", "date", name="uq_day_summary_user_date"),
    )
