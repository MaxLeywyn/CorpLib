import os
from flask import Flask, send_from_directory
from MaxLuc.app.config import Config
from MaxLuc.app.extensions import db, ma, socketio
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta


jwt = JWTManager()

def create_app(config_class=Config):

    app = Flask(__name__)

    app.config.from_object(config_class)
    app.config["JWT_SECRET_KEY"] = "super-secret-key-og-velichie-228"
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
    app.config["JWT_COOKIE_CSRF_PROTECT"] = False
    app.config["JWT_CSRF_IN_COOKIES"] = False
    app.json.ensure_ascii = False

    if not app.config.get('UPLOAD_FOLDER'):
        app.config['UPLOAD_FOLDER'] = os.path.join(app.root_path, 'uploads')

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

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Настройка CORS
    allowed_origins = [
        "https://d87cc2ba-af2c-4571-b698-472681ebb851.tunnel4.com",
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
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True
            },
            r"/uploads/*": {
                "origins": allowed_origins,
                "methods": ["GET", "OPTIONS"]
            }
        }
    )

    return app