from flask import Blueprint, jsonify, request
from datetime import datetime
from MaxLuc.app.extensions import db
from MaxLuc.app.models import DownloadHistory, Material, User

history_bp = Blueprint('history', __name__, url_prefix='/api/history')


@history_bp.route('/track', methods=['POST'])
def track_material_access():
    """
    Фиксирует, что пользователь скачал книгу или посмотрел видео
    """
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        material_id = data.get('material_id')

        if not user_id or not material_id:
            return jsonify({"status": "error", "message": "user_id и material_id обязательны"}), 400

        # Проверяем, существуют ли вообще такие юзер и материал
        user_exists = User.query.get(user_id)
        material_exists = Material.query.get(material_id)

        if not user_exists:
            return jsonify({"status": "error", "message": f"Пользователь с ID {user_id} не найден"}), 404
        if not material_exists:
            return jsonify({"status": "error", "message": f"Материал с ID {material_id} не найден"}), 404

        # Добавляем запись в историю скачиваний
        history_entry = DownloadHistory(
            user_id=user_id,
            material_id=material_id,
            accessed_at=datetime.utcnow()
        )
        db.session.add(history_entry)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Доступ к материалу '{material_exists.title}' успешно зафиксирован в истории юзера {user_exists.login}."
        }), 201

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@history_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_history(user_id):
    """
    Возвращает список всех материалов, которые этот пользователь читал или смотрел
    """
    try:
        # Ищем записи в истории для конкретного юзера и подтягиваем связанные материалы
        history_records = DownloadHistory.query.filter_by(user_id=user_id).order_by(
            DownloadHistory.accessed_at.desc()).all()

        result = []
        for record in history_records:
            # Получаем объект материала напрямую благодаря backref/relationship в ORM
            material = Material.query.get(record.material_id)
            if material:
                result.append({
                    "history_id": record.id,
                    "accessed_at": record.accessed_at.isoformat(),
                    "material": {
                        "id": material.id,
                        "title": material.title,
                        "type": material.type,
                        "file_url": material.file_url
                    }
                })

        return jsonify({
            "status": "success",
            "user_id": user_id,
            "history_count": len(result),
            "history": result
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@history_bp.route('/api/tunnel-test', methods=['GET'])
def tunnel_test():
    return jsonify({
        "host_header": request.host,
        "url": request.url,
        "origin": request.headers.get('Origin'),
        "x_forwarded_for": request.headers.get('X-Forwarded-For'),
        "message": "Tunnel works!"
    }), 200