import os
from flask import Flask
from MaxLuc.app.config import Config
from MaxLuc.app.extensions import db, ma, socketio
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta

jwt = JWTManager()

def create_app(config_class=Config):
    app = Flask(__name__)


    app.config.from_object(config_class)
    app.config["JWT_SECRET_KEY"] = "super-secret-key-change-me-in-production"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_CSRF_IN_COOKIES"] = False
    app.json.ensure_ascii = False


    jwt.init_app(app)
    socketio.init_app(app)
    db.init_app(app)
    ma.init_app(app)

    # Регистрация блупринтов
    from MaxLuc.app.routes.materials import materials_bp
    from MaxLuc.app.routes.courses import courses_bp
    from MaxLuc.app.routes.admin import admin_bp
    from MaxLuc.app.routes.history import history_bp
    from MaxLuc.app.routes.auth import auth_bp

    app.register_blueprint(materials_bp)
    app.register_blueprint(courses_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(auth_bp)

    # Настройка CORS
    allowed_origins = [
        "http://localhost:63342"  # Саня
    ]

    extra_origin = os.getenv("EXPORT_CORS_ORIGIN")
    if extra_origin:
        allowed_origins.append(extra_origin)


    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization", "X-User-Id"],
                "supports_credentials": True
            }
        }
    )

    return app