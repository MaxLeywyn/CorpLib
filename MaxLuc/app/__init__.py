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

    # ==============================================================================
    # Конфигурация CORS для локальной разработки
    # ==============================================================================
    # Указываем порты, на которых может быть запущен ваш фронтенд.
    # 3000 - стандартный порт для Create React App
    # 5173 - стандартный порт для Vite (Vue, React, Svelte)
    # 8080 - часто используется для локальных серверов
    # ==============================================================================
    ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080"
    ]

    CORS(
        app,
        origins=ALLOWED_ORIGINS,       # Разрешенные источники
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # Разрешенные HTTP методы
        allow_headers=["Content-Type", "Authorization"],     # Разрешенные заголовки
        supports_credentials=True      # Позволяет передачу cookies и заголовков авторизации
    )

    return app