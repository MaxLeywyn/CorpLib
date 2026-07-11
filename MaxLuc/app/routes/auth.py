from flask import Blueprint, jsonify, request
from MaxLuc.app.models import User, Role
from MaxLuc.app.extensions import db
from werkzeug.security import check_password_hash
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    login_input = data.get('login')
    password_input = data.get('password')

    user = User.query.filter_by(login=login_input).first()

    # Предполагаем, что у тебя пароли проверяются через хеш
    if not user or not check_password_hash(user.password_hash, password_input):
        return jsonify({"status": "error", "message": "Неверный логин или пароль"}), 401

    additional_claims = {"role": user.role.name if user.role else "employee"}
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "status": "success",
        "token": access_token,  # Передаем токен фронтенду
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "role": additional_claims["role"]
        }
    }), 200




@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Эндпоинт регистрации нового сотрудника с безопасным хешированием пароля
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
            # на случай, если база пустая
            role = Role(name="employee")
            db.session.add(role)
            db.session.flush()


        hashed_password = generate_password_hash(password_input)

        new_user = User(
            login=login_input,
            password_hash=hashed_password,  # Сохраняем безопасный хеш
            full_name=full_name_input,
            role_id=role.id
        )

        db.session.add(new_user)
        db.session.commit()


        additional_claims = {"role": role.name}
        access_token = create_access_token(identity=str(new_user.id), additional_claims=additional_claims)

        return jsonify({
            "status": "success",
            "message": f"Пользователь '{new_user.full_name}' успешно зарегистрирован.",
            "token": access_token,
            "user": {
                "id": new_user.id,
                "login": new_user.login,
                "name": new_user.full_name,
                "role": role.name
            }
        }), 201

    except Exception as e:
        db.session.rollback()  # Хорошая практика — откатить транзакцию при ошибке
        return jsonify({"status": "error", "message": str(e)}), 500