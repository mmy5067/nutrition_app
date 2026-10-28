# app/routes_public.py
from flask import Blueprint, redirect
from .config import get_settings

bp = Blueprint("public", __name__)

@bp.get("/")
def index():
    return redirect(get_settings().FRONTEND_URL)
