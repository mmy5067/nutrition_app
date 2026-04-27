# app/cli.py
import secrets
from flask import Flask
from . import db
from .models import Invite

def register_cli(app: Flask):
    @app.cli.command("gen-invite")
    def gen_invite():
        code = secrets.token_urlsafe(10).replace("-", "").replace("_", "")
        inv = Invite(code=code)
        db.session.add(inv)
        db.session.commit()
        print("Invite code:", code)

    @app.cli.command("gen-invite-batch")
    def gen_invite_batch():
        codes = []
        for _ in range(10):
            c = secrets.token_urlsafe(10).replace("-", "").replace("_", "")
            db.session.add(Invite(code=c))
            codes.append(c)
        db.session.commit()
        print("\n".join(codes))
