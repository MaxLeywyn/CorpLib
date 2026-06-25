from flask import Flask
from MaxLuc.app.config import Config
from MaxLuc.app.extensions import db, ma
from flask_cors import CORS

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)


    # Инициализация расширений внутри контекста приложения
    db.init_app(app)
    ma.init_app(app)

    # Регистрация модулей (Blueprints)
    from MaxLuc.app.routes.materials import materials_bp
    from MaxLuc.app.routes.courses import courses_bp

    app.register_blueprint(materials_bp)
    app.register_blueprint(courses_bp)

    CORS(app)

    return app