from flask import Blueprint, jsonify, request, current_app
from MaxLuc.app.extensions import db
from MaxLuc.app.models import Material, Course, Category, CourseModuleMaterial, User, Role, Tag, material_tags
from sqlalchemy import func
from flask_jwt_extended import get_jwt_identity
import os, traceback


from MaxLuc.app.utils.decorators import admin_required, superuser_required, login_required
from MaxLuc.app.routes.materials import (ALLOWED_BOOK_EXTENSIONS,
                                         ALLOWED_VIDEO_EXTENSIONS,
                                         ALLOWED_COVER_EXTENSIONS,
                                         save_file, check_file_size_limit)


admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_library_stats():
    """
    Вычисляет общую статистику библиотеки для HR-администратора
    """
    try:
        total_materials = Material.query.count()
        total_books = Material.query.filter_by(type='book').count()
        total_videos = Material.query.filter_by(type='video').count()
        total_courses = Course.query.count()

        stats_by_category = db.session.query(
            Category.name,
            func.count(Material.id)
        ).join(Material, Material.category_id == Category.id)\
         .group_by(Category.name).all()

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
@admin_required
def update_material(material_id):
    """
    Редактирование метаданных и файлов материала администратором.
    """
    try:
        material = Material.query.get(material_id)
        if not material:
            return jsonify({"status": "error", "message": "Материал не найден"}), 404

        if 'title' in request.form:
            material.title = request.form['title'].strip()
        if 'description' in request.form:
            material.description = request.form['description'].strip()
        if 'author' in request.form:
            material.author = request.form['author'].strip()
        if 'category_id' in request.form:
            material.category_id = int(request.form['category_id'])

        raw_tags = request.form.getlist('tags') + request.form.getlist('tags[]')

        if raw_tags:
            tag_names = []
            for item in raw_tags:
                if ',' in item:
                    tag_names.extend([t.strip() for t in item.split(',') if t.strip()])
                else:
                    if item.strip():
                        tag_names.append(item.strip())

            tag_names = list(set(tag_names))

            material.tags.clear()
            db.session.flush()

            for tag_name in tag_names:
                tag = Tag.query.filter_by(name=tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.session.add(tag)

                material.tags.append(tag)

        file_obj = request.files.get('file')
        cover_obj = request.files.get('cover')

        # Валидация обложки
        if cover_obj:
            cover_path = save_file(cover_obj, 'covers', ALLOWED_COVER_EXTENSIONS)
            material.cover_url = cover_path

        # Валидация основного файла
        if file_obj:
            is_valid, size_error = check_file_size_limit(file_obj, material.type)
            if not is_valid:
                return jsonify({"status": "error", "message": size_error}), 400

            if material.type == 'book':
                allowed_exts = ALLOWED_BOOK_EXTENSIONS
                subfolder = 'books'
            else:
                allowed_exts = ALLOWED_VIDEO_EXTENSIONS
                subfolder = 'videos'

            file_path = save_file(file_obj, subfolder, allowed_exts)
            material.file_url = file_path

            full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path)
            material.file_size = os.path.getsize(full_path) // 1024

        db.session.commit()

        cleanup_unused_tags()

        return jsonify({
            "status": "success",
            "message": f"Материал ID {material_id} успешно обновлен."
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"\n!!! Ошибка внутри эндпоинта update_material: {e}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

def cleanup_unused_tags():
    """
    Находит и полностью удаляет из базы теги,
    которые не привязаны ни к одному материалу.
    """
    try:
        used_tag_ids = db.session.query(material_tags.c.tag_id).distinct().subquery()
        deleted_count = Tag.query.filter(~Tag.id.in_(used_tag_ids)).delete(synchronize_session=False)

        db.session.commit()

        if deleted_count > 0:
            print(f"[GC] Очистка тегов завершена. Удалено сиротских тегов: {deleted_count}")

        return deleted_count

    except Exception as e:
        db.session.rollback()
        print(f"[GC ERROR] Не удалось провести очистку тегов: {e}")
        return 0

@admin_bp.route('/materials/<int:material_id>', methods=['DELETE'])
@admin_required
def delete_material(material_id):
    """
    Удаление материала из базы данных и очистка физических файлов с диска
    """
    try:
        material = Material.query.get(material_id)
        if not material:
            return jsonify({"status": "error", "message": "Материал не найден"}), 404

        upload_folder = current_app.config.get('UPLOAD_FOLDER')
        file_to_delete = material.file_url
        cover_to_delete = material.cover_url
        material_title = material.title

        db.session.delete(material)
        db.session.commit()

        if upload_folder:
            if file_to_delete:
                full_file_path = os.path.join(upload_folder, file_to_delete)
                if os.path.exists(full_file_path):
                    try:
                        os.remove(full_file_path)
                    except OSError as e:
                        print(f"[WARNING] Не удалось удалить файл {full_file_path}: {e}")

            # чистим файл обложки
            if cover_to_delete:
                full_cover_path = os.path.join(upload_folder, cover_to_delete)
                if os.path.exists(full_cover_path):
                    try:
                        os.remove(full_cover_path)
                    except OSError as e:
                        print(f"[WARNING] Не удалось удалить обложку {full_cover_path}: {e}")

        return jsonify({
            "status": "success",
            "message": f"Материал '{material_title}' и связанные с ним файлы успешно удалены."
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Ошибка при удалении материала ID {material_id}: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500


# --- УПРАВЛЕНИЕ КАТЕГОРИЯМИ ---

@admin_bp.route('/categories', methods=['POST'])
@admin_required
def create_category():
    """
    Создание новой категории администратором
    """
    try:
        data = request.get_json() or {}
        name_input = data.get('name')
        description_input = data.get('description')

        if not name_input:
            return jsonify({
                "status": "error",
                "message": "Поле name обязательно для заполнения"
            }), 400

        existing_category = Category.query.filter_by(name=name_input).first()
        if existing_category:
            return jsonify({
                "status": "error",
                "message": f"Категория с названием '{name_input}' уже существует"
            }), 400

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
@admin_required
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


@admin_bp.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
    """
    Редактирование существующей категории администратором
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"status": "error", "message": "Категория не найдена"}), 404

        data = request.get_json() or {}
        name_input = data.get('name')
        description_input = data.get('description')

        if name_input and name_input != category.name:
            existing_category = Category.query.filter_by(name=name_input).first()
            if existing_category:
                return jsonify({
                    "status": "error",
                    "message": f"Категория '{name_input}' уже существует"
                }), 400
            category.name = name_input

        if 'description' in data:
            category.description = description_input

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Категория успешно обновлена.",
            "category": {
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "created_at": category.created_at.isoformat() if category.created_at else None
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_bp.route('/categories', methods=['GET'])
@login_required
def get_admin_categories():
    """
    Получение списка всех категорий для всех
    """
    try:
        categories = Category.query.order_by(Category.name.asc()).all()

        categories_data = []
        for cat in categories:
            categories_data.append({
                "id": cat.id,
                "name": cat.name,
                "description": cat.description
            })

        return jsonify({
            "status": "success",
            "count": len(categories_data),
            "categories": categories_data
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# -- Управление HR

@admin_bp.route('/users/<int:target_user_id>/role', methods=['PUT'])
@superuser_required
def update_user_role(target_user_id):
    """
    Изменение роли пользователя (Назначение/снятие прав HR/admin)
    """
    try:
        target_user = User.query.get(target_user_id)
        if not target_user:
            return jsonify({"status": "error", "message": "Пользователь не найден"}), 404

        data = request.get_json() or {}
        new_role_name = data.get('role')  # 'admin' или 'employee'

        if new_role_name not in ['admin', 'employee']:
            return jsonify({
                "status": "error",
                "message": "Недопустимая роль. Можно выбрать только 'admin' или 'employee'"
            }), 400

        current_su_id = get_jwt_identity()
        if int(current_su_id) == target_user_id:
            return jsonify({
                "status": "error",
                "message": "Вы не можете изменить роль самому себе"
            }), 400

        role = Role.query.filter_by(name=new_role_name).first()
        if not role:
            return jsonify({"status": "error", "message": f"Роли '{new_role_name}' нет"}), 500

        old_role = target_user.role.name if target_user.role else 'employee'
        target_user.role_id = role.id
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Роль пользователя {target_user.full_name} успешно изменена с '{old_role}' на '{new_role_name}'.",
            "user": {
                "id": target_user.id,
                "full_name": target_user.full_name,
                "role": role.name
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_bp.route('/users', methods=['GET'])
@superuser_required
def get_personnel_for_management():
    """
    Получение списка всего персонала (кроме superuser) для назначения HR-прав
    """
    try:
        users = User.query.outerjoin(Role).filter(
            (Role.name != 'superuser') | (User.role_id == None)
        ).order_by(User.full_name.asc()).all()

        personnel_list = []
        for u in users:
            personnel_list.append({
                "id": u.id,
                "full_name": u.full_name,
                "login": u.login,
                "role": u.role.name if u.role else 'employee'
            })

        return jsonify({
            "status": "success",
            "count": len(personnel_list),
            "users": personnel_list
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# --- ПОЛУЧЕНИЕ КУРСОВ И МАТЕРИАЛОВ КОНКРЕТНОЙ КАТЕГОРИИ ---

@admin_bp.route('/categories/<int:category_id>/courses', methods=['GET'])
@login_required
def get_category_courses(category_id):
    """
    Возвращает список курсов, привязанных к конкретной категории
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"status": "error", "message": "Категория не найдена"}), 404

        courses = Course.query.filter_by(category_id=category_id).all()

        result = []
        for course in courses:
            result.append({
                "id": course.id,
                "title": course.title,
                "description": course.description
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@admin_bp.route('/categories/<int:category_id>/materials', methods=['GET'])
@login_required
def get_category_standalone_materials(category_id):
    """
    Возвращает список одиночных материалов (книг и видео) этой категории, не входящих в курсы
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({"status": "error", "message": "Категория не найдена"}), 404

        #ID всех материалов, которые уже привязаны к модулям курсов
        assigned_material_ids = db.session.query(CourseModuleMaterial.material_id).distinct().all()
        assigned_ids = [m_id[0] for m_id in assigned_material_ids]

        #материалы, принадлежащие этой категории и не входящие в курсы
        standalone_materials = Material.query.filter(
            Material.category_id == category_id,
            Material.id.notin_(assigned_ids) if assigned_ids else True
        ).all()

        result = []

        for mat in standalone_materials:
            result.append({
                "id": mat.id,
                "title": mat.title,
                "type": mat.type,
                "author": mat.author or "Не указан",
                "description": mat.description or "",
                "file_size": (mat.file_size or 0) * 1024,

                "cover_url": f"/uploads/{mat.cover_url}" if mat.cover_url else None,
                "file_url": f"/uploads/{mat.file_url}" if mat.file_url else "#"
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500