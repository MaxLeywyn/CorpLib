from flask import Blueprint, jsonify, request
from MaxLuc.app.extensions import db
from MaxLuc.app.models import Material, Course, Category
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/stats', methods=['GET'])
def get_library_stats():
    """
    Вычисляет общую статистику библиотеки для HR-администратора
    """
    try:
        # 1. Считаем общие объемы контента
        total_materials = Material.query.count()
        total_books = Material.query.filter_by(type='book').count()
        total_videos = Material.query.filter_by(type='video').count()
        total_courses = Course.query.count()

        # 2.группируем количество материалов по категориям
        stats_by_category = db.session.query(
            Category.name,
            func.count(Material.id)
        ).join(Material, Material.category_id == Category.id)\
         .group_by(Category.name).all()

        # Трансформируем результат в удобный словарь { "Имя категории": количество }
        category_breakdown = {name: count for name, count in stats_by_category}

        return jsonify({
            "status": "success",
            "summary": {
                "total_all_materials": total_materials,
                "total_books": total_books,
                "total_videos": total_videos,
                "total_courses": total_courses
            },
            "by_category": category_breakdown
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# --- УПРАВЛЕНИЕ МАТЕРИАЛАМИ ---

@admin_bp.route('/materials/<int:material_id>', methods=['PUT'])
def update_material(material_id):
    """
    Редактирование метаданных материала администратором
    """
    try:
        material = Material.query.get(material_id)
        if not material:
            return jsonify({"status": "error", "message": "Материал не найден"}), 404

        data = request.get_json() or {}

        # Обновляем только те поля, которые пришли в запросе
        if 'title' in data: material.title = data['title']
        if 'description' in data: material.description = data['description']
        if 'cover_url' in data: material.cover_url = data['cover_url']
        if 'author' in data: material.author = data['author']
        if 'category_id' in data: material.category_id = data['category_id']

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": f"Материал ID {material_id} успешно обновлен."
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_bp.route('/materials/<int:material_id>', methods=['DELETE'])
def delete_material(material_id):
    """
    Удаление материала из базы данных
    """
    try:
        material = Material.query.get(material_id)
        if not material:
            return jsonify({"status": "error", "message": "Материал не найден"}), 404

        db.session.delete(material)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": f"Материал '{material.title}' успешно удален из системы."
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- УПРАВЛЕНИЕ КАТЕГОРИЯМИ ---

@admin_bp.route('/categories', methods=['POST'])
def create_category():
    """
    Создание новой категории администратором
    """
    try:
        data = request.get_json() or {}
        name_input = data.get('name')
        description_input = data.get('description')

        # 1. Валидация обязательных полей
        if not name_input:
            return jsonify({
                "status": "error",
                "message": "Поле 'name' (название категории) обязательно для заполнения"
            }), 400

        # 2. Проверяем, нет ли уже категории с таким именем (у тебя в модели стоит unique=True)
        existing_category = Category.query.filter_by(name=name_input).first()
        if existing_category:
            return jsonify({
                "status": "error",
                "message": f"Категория с названием '{name_input}' уже существует"
            }), 400

        # 3. Создаем и сохраняем категорию
        new_category = Category(
            name=name_input,
            description=description_input
        )
        db.session.add(new_category)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Категория '{new_category.name}' успешно создана.",
            "category": {
                "id": new_category.id,
                "name": new_category.name,
                "description": new_category.description,
                "created_at": new_category.created_at.isoformat() if new_category.created_at else None
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_bp.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """
    Удаление категории. Проверяем, как сработает ON DELETE SET NULL
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"status": "error", "message": "Категория не найдена"}), 404

        category_name = category.name
        db.session.delete(category)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Категория '{category_name}' удалена. Связанные материалы переведены в статус 'Без категории'."
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500