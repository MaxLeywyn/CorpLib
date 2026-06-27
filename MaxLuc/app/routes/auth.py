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

        # Ищем пользователя в БД по логину (email)
        user = User.query.filter_by(login=login_input).first()

        # Проверяем существование пользователя и соответствие пароля
        # Примечание: Если в БД пароли хранятся в виде хэша, здесь нужно использовать check_password_hash(user.password_hash, password_input)
        if not user or user.password_hash != password_input:
            return jsonify({"status": "error", "message": "Неверный логин или пароль"}), 401

        # Получаем имя роли через связь backref/relationship 'role'
        role_name = user.role.name if user.role else "employee"

        # Возвращаем фронтенду ровно то, что ему нужно для сохранения сессии
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

        # 1. Проверяем, что фронт передал все обязательные поля
        if not login_input or not password_input or not full_name_input:
            return jsonify({
                "status": "error",
                "message": "Поля login, password и full_name обязательны для заполнения"
            }), 400

        # 2. Проверяем, нет ли уже юзера с таким логином в PostgreSQL
        existing_user = User.query.filter_by(login=login_input).first()
        if existing_user:
            return jsonify({
                "status": "error",
                "message": "Пользователь с таким email/логином уже зарегистрирован"
            }), 400

        # 3. Ищем дефолтную роль 'employee' для нового человека
        role = Role.query.filter_by(name="employee").first()
        if not role:
            # На случай, если база абсолютно пустая, создаем роль на лету
            role = Role(name="employee")
            db.session.add(role)
            db.session.flush()

        # 4. Создаем запись нового пользователя
        # (Примечание: пока пишем пароль напрямую, как просил фронт для тестов)
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