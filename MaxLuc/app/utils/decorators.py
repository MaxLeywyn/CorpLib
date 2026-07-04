from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Проверяет наличие и валидность JWT-токена в заголовках запроса
            verify_jwt_in_request(locations=["headers"])
            return f(*args, **kwargs)
        except Exception:
            return jsonify({"status": "error", "message": "Доступ запрещен. Токен невалиден или отсутствует."}), 401
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request(locations=["headers"])
            claims = get_jwt() # Достаем зашитые в токен claims (права)
            if claims.get("role") not in ["admin", "superuser"]:
                return jsonify({"status": "error", "message": "Недостаточно прав (Требуется роль HR/Admin)"}), 403
            return f(*args, **kwargs)
        except Exception:
            return jsonify({"status": "error", "message": "Ошибка авторизации"}), 401

    return decorated_function

def superuser_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request(locations=["headers"])
            claims = get_jwt()
            if claims.get("role") != "superuser":
                return jsonify({"status": "error", "message": "Строго ограниченный доступ (Требуется Superuser)"}), 403
            return f(*args, **kwargs)
        except Exception:
            return jsonify({"status": "error", "message": "Ошибка авторизации"}), 401
    return decorated_function