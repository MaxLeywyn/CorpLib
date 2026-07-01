from flask import Blueprint, jsonify, request
from MaxLuc.app.models import User, Role
from MaxLuc.app.extensions import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Эндпоинт авторизации для фронтенда
    """
    try:
        data = request.get_json() or {}
        login_input = data.get('login')
        password_input = data.get('password')

        if not login_input or not password_input:
            return jsonify({"status": "error", "message": "Логин и пароль обязательны"}), 400

        #поиск пользователя в БД по логину (email)
        user = User.query.filter_by(login=login_input).first()

        if not user or user.password_hash != password_input:
            return jsonify({"status": "error", "message": "Неверный логин или пароль"}), 401

        role_name = user.role.name if user.role else "employee"

        # ответ фронту
        return jsonify({
            "status": "success",
            "message": "Авторизация успешна",
            "user": {
                "id": user.id,
                "login": user.login,
                "name": user.full_name,
                "role": role_name
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500




@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Эндпоинт регистрации нового сотрудника
    """
    try:
        data = request.get_json() or {}
        login_input = data.get('login')
        password_input = data.get('password')
        full_name_input = data.get('full_name')

        if not login_input or not password_input or not full_name_input:
            return jsonify({
                "status": "error",
                "message": "Поля login, password и full_name обязательны для заполнения"
            }), 400

        existing_user = User.query.filter_by(login=login_input).first()
        if existing_user:
            return jsonify({
                "status": "error",
                "message": "Пользователь с таким email/логином уже зарегистрирован"
            }), 400

        role = Role.query.filter_by(name="employee").first()
        if not role:
            #на случай, если база пустая
            role = Role(name="employee")
            db.session.add(role)
            db.session.flush()

        new_user = User(
            login=login_input,
            password_hash=password_input,
            full_name=full_name_input,
            role_id=role.id
        )

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Пользователь '{new_user.full_name}' успешно зарегистрирован.",
            "user": {
                "id": new_user.id,
                "login": new_user.login,
                "name": new_user.full_name,
                "role": role.name
            }
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500