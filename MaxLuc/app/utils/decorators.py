from functools import wraps
from flask import request, jsonify
from MaxLuc.app.models import User


def login_required(f):
    """
    Проверяет, что пользователь авторизован (существует в БД)
    Подходит для любых защищенных роутов сотрудника
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return jsonify({
                "status": "error",
                "message": "в заголовках запроса не передан X-User-Id"
            }), 401


        user = User.query.get(user_id)

        if not user:
            return jsonify({
                "status": "error",
                "message": "сессия недействительна (ну или пользователь не найден)"
            }), 401


        return f(*args, **kwargs)

    return decorated_function


def admin_required(f):
    """
    Проверяет, что пользователь имеет права админа/суперюзера
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return jsonify({
                "status": "error",
                "message": "в заголовках запроса не передан X-User-Id"
            }), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "status": "error",
                "message": "пользователь не найден в системе"
            }), 401

        user_role = user.role.name if user.role else 'employee'
        if user_role not in ['admin', 'superuser']:
            return jsonify({
                "status": "error",
                "message": f"роль ({user_role}) не имеет прав администратора"
            }), 403

        return f(*args, **kwargs)

    return decorated_function


def superuser_required(f):
    """
    Проверяет, что пользователь имеет права \суперюзера
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = request.headers.get('X-User-Id')

        if not user_id:
            return jsonify({
                "status": "error",
                "message": "В заголовках запроса не передан X-User-Id"
            }), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({
                "status": "error",
                "message": "пользователь не найден в системе"
            }), 401

        user_role = user.role.name if user.role else 'employee'
        if user_role != 'superuser':
            return jsonify({
                "status": "error",
                "message": f"Нельзя: роль ({user_role}) не имеет прав администратора"
            }), 403

        return f(*args, **kwargs)

    return decorated_function