import os
from flask import Flask
from MaxLuc.app.config import Config
from MaxLuc.app.extensions import db, ma
from flask_cors import CORS

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.json.ensure_ascii = False

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

    # ==============================================================================
    # Настройка CORS
    # ==============================================================================
    #адреса для локальной разработки
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:63342", #Саня
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080"
    ]


    extra_origin = os.getenv("EXPORT_CORS_ORIGIN")
    if extra_origin:
        allowed_origins.append(extra_origin)

    #Применяем конфигурацию
    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": allowed_origins,
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "X-User-Id","Authorization"],
                "supports_credentials": True
            }
        }
    )

    return app