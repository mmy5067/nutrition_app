# app/__init__.py
from flask import Flask, redirect
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_cors import CORS
from .config import get_settings
from datetime import datetime


db = SQLAlchemy()
login_manager = LoginManager()

def create_app():
    
    settings = get_settings()
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.config["SECRET_KEY"] = settings.SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = settings.DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["STARTED_AT"] = datetime.now()
    

    # Session & 安全建议：生产上务必配 HTTPS 再开启 Secure/HttpOnly/SameSite
    app.config.update(
        SESSION_COOKIE_HTTPONLY=True,
        REMEMBER_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
    )

    CORS(app, supports_credentials=True)
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "auth.login_page"

    # 注册 CLI
    from .cli import register_cli
    register_cli(app)


    from .models import User

    @login_manager.user_loader
    def load_user(user_id: str):
        return db.session.get(User, int(user_id))

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    from .routes_public import bp as public_bp
    from .routes_auth import bp as auth_bp     
    from .routes_meals import bp as meals_bp
    from .routes_profile import bp as profile_bp
    from .routes_ai import bp as ai_bp
    from .routes_admin import bp as admin_bp

    app.register_blueprint(public_bp)
    app.register_blueprint(meals_bp, url_prefix="/api/meals")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(profile_bp, url_prefix="/api/profile")   
    app.register_blueprint(ai_bp, url_prefix="/api/ai")
    app.register_blueprint(admin_bp)

    # 提供登录页
    @app.get("/login")
    def login_page():
        return redirect(f"{settings.FRONTEND_URL.rstrip('/')}/login")

    return app
