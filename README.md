# Корпоративная онлайн-библиотека

Бэкенд для корпоративной онлайн-библиотеки. Представляет собой API на Flask для управления учебными и рабочими материалами компании.

---

## Стек технологий
* **Язык:** Python 3.11+
* **Фреймворк:** Flask
* **База данных:** PostgreSQL
* **ORM:** Flask-SQLAlchemy
* **Авторизация и безопасность:** Flask-JWT-Extended + PyJWT + Werkzeug
* **Валидация и сериализация данных:** Marshmallow
* **Интерактивность:** Flask-SocketIO

---

## Быстрый запуск локально

Инструкция для развертывания бэкенда в локальном окружении разработки.

### 1. Клонирование репозитория
```bash
git clone https://github.com/MaxLeywyn/CorpLib.git
cd CorpLib
```

### 2. Настройка виртуального окружения

Для Windows:
```bash
python -m venv venv
venv\Scripts\activate
```

Для Mac/Linux:
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Установка зависимостей
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Конфигурация базы данных

Перед запуском убедитесь, что у вас поднят локальный сервер PostgreSQL и создана база данных для проекта. Строка подключения к базе данных настраивается в файле app/config.py

### 5. Запуск приложения
```bash
python app.py
```

После старта бэкенд-сервер будет доступен по адресу: http://127.0.0.1:5000/