import os
import sys

# Чиним кодировку сообщений от PostgreSQL
os.environ["PGCLIENTENCODING"] = "utf-8"

# Добавляем корневую директорию проекта в пути поиска модулей Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# ИСПРАВЛЕНО: используем те же пути импорта, что и в __init__.py
from MaxLuc.app import create_app
from MaxLuc.app.extensions import db

app = create_app()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()

    app.run(debug=True, port=5000)