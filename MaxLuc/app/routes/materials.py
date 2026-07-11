import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import or_
from flask_jwt_extended import get_jwt_identity

from MaxLuc.app.extensions import db
from MaxLuc.app.models import Material, Tag, DownloadHistory, CourseModuleMaterial, UserCourseProgress, Category, Course
from MaxLuc.app.schemas import material_schema, materials_schema
from MaxLuc.app.utils.decorators import admin_required, login_required

materials_bp = Blueprint('materials', __name__, url_prefix='/api/materials')

# Допустимые расширения файлов по ТЗ
ALLOWED_BOOK_EXTENSIONS = {'pdf'}
ALLOWED_VIDEO_EXTENSIONS = {'mp4'}
ALLOWED_COVER_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set


def save_file(file_obj, subfolder, allowed_extensions):
    """Вспомогательная функция для безопасного сохранения файлов с уникальным именем"""
    if not file_obj or file_obj.filename == '':
        return None

    if not allowed_file(file_obj.filename, allowed_extensions):
        raise ValueError(f"Недопустимый формат файла. Разрешены только: {', '.join(allowed_extensions)}")

    ext = file_obj.filename.rsplit('.', 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    target_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(target_dir, exist_ok=True)

    file_path = os.path.join(target_dir, unique_name)
    file_obj.save(file_path)

    return f"{subfolder}/{unique_name}"


# ==============================================================================
# 1. ПОЛУЧЕНИЕ МАТЕРИАЛОВ (КАТАЛОГ И ПОИСК)
# ==============================================================================
@materials_bp.route('/search', methods=['POST'])
@login_required
def search_catalog():
    """
    Универсальный поиск и фильтрация материалов и курсов
    """
    try:
        data = request.get_json() or {}
        types = data.get('types', [])
        category_ids = data.get('category_ids', [])
        tags = data.get('tags', [])
        search_query = data.get('search_query', '').strip()

        response_data = []

        search_books_videos = not types or ('book' in types or 'video' in types)
        search_courses = not types or ('course' in types)

        #ПОИСК КНИГ И ВИДЕО
        if search_books_videos:
            query_mat = Material.query


            subquery = db.session.query(CourseModuleMaterial.material_id).subquery()
            query_mat = query_mat.filter(~Material.id.in_(subquery))

            if types and len(types) < 3:
                allowed_material_types = [t for t in types if t in ['book', 'video']]
                if allowed_material_types:
                    query_mat = query_mat.filter(Material.type.in_(allowed_material_types))

            if category_ids:
                query_mat = query_mat.filter(Material.category_id.in_(category_ids))

            if search_query:
                search_fmt = f"%{search_query}%"
                query_mat = query_mat.filter(
                    or_(
                        Material.title.ilike(search_fmt),
                        Material.author.ilike(search_fmt),
                        Material.description.ilike(search_fmt)
                    )
                )

            if tags:
                query_mat = query_mat.filter(Material.tags.any(Tag.name.in_(tags)))

            materials = query_mat.all()

            for material in materials:
                response_data.append({
                    "id": material.id,
                    "type": material.type,
                    "title": material.title,
                    "author": material.author or "",
                    "description": material.description or "",
                    "cover_url": f"/uploads/{material.cover_url}" if material.cover_url else None,
                    "file_url": f"/uploads/{material.file_url}" if material.file_url else None,
                    "file_size": (material.file_size or 0) * 1024,  # переводим в байты для фронта
                    "tags": [tag.name for tag in material.tags],
                    "category_id": material.category_id
                })

        # ПОИСК КУРСОВ
        if search_courses:
            query_c = Course.query

            if category_ids:
                query_c = query_c.filter(Course.category_id.in_(category_ids))

            if search_query:
                search_fmt = f"%{search_query}%"
                query_c = query_c.filter(
                    or_(
                        Course.title.ilike(search_fmt),
                        Course.description.ilike(search_fmt)
                    )
                )

            courses = query_c.all()

            from MaxLuc.app.models import CourseModule

            for c in courses:
                tags_query = db.session.query(Tag.name).join(Material.tags).join(
                    CourseModuleMaterial, CourseModuleMaterial.material_id == Material.id
                ).join(
                    CourseModule, CourseModule.id == CourseModuleMaterial.module_id
                ).filter(CourseModule.course_id == c.id).distinct()

                course_tags = [t[0] for t in tags_query.all()]

                if tags and not any(tag in course_tags for tag in tags):
                    continue

                course_cover = f"/uploads/{c.cover_url.lstrip('/')}" if c.cover_url else "/uploads/covers/default_course.png"

                response_data.append({
                    "id": c.id,
                    "type": "course",
                    "title": c.title,
                    "description": c.description or "",
                    "cover_url": course_cover,
                    "file_url": None,
                    "file_size": None,
                    "tags": course_tags,
                    "category_id": c.category_id
                })

        return jsonify(response_data), 200


            if types and len(types) < 3:
                allowed_material_types = [type for type in types if type in ['book', 'video']]
                if allowed_material_types:
                    query_mat = query_mat.filter(Material.type.in_(allowed_material_types))

            if category_ids:
                query_mat = query_mat.filter(Material.category_id.in_(category_ids))

            if search_query:
                search_fmt = f"%{search_query}%"
                query_mat = query_mat.filter(
                    or_(
                        Material.title.ilike(search_fmt),
                        Material.author.ilike(search_fmt),
                        Material.description.ilike(search_fmt)
                    )
                )
            
            if tags:
                query_mat = query_mat.filter(Material.tags.any(Tag.name.in_(tags)))

            materials = query_mat.all()

            for material in materials:
                response_data.append({
                    "id": material.id,
                    "type": material.type,
                    "title": material.title,
                    "author": material.author or "",
                    "description": material.description or "",
                    "cover_url": f"{base_url}{material.cover_url}" if material.cover_url else None,
                    "file_url": f"{base_url}{material.file_url}" if material.file_url else None,
                    "file_size": material.file_size,
                    "tags": [tag.name for tag in material.tags],
                    "category_id": material.category_id
                })

        if search_courses:
            query_c = Course.query

            if category_ids:
                query_c = query_c.filter(Course.category_id.in_(category_ids))

            if search_query:
                search_fmt = f"%{search_query}%"
                query_c = query_c.filter(
                    or_(
                        Course.title.ilike(search_fmt),
                        Course.author.ilike(search_fmt),
                        Course.description.ilike(search_fmt)
                    )
                )
                
            courses = query_c.all()

            for c in courses:
                course_tags = set()
                for module in c.modules:
                    for link in module.materials:
                        mat_item = Material.query.get(link.material_id)
                        if mat_item:
                            for tag in mat_item.tags:
                                course_tags.add(tag.name)

                if tags and not any(tag in course_tags for tag in tags):
                    continue
                
                course_cover = None
                if c.cover_url:
                    course_cover = f"{base_url.rstrip('/')}/api/materials/static/{c.cover_url.lstrip('/')}"
                else:
                    course_cover = f"{base_url.rstrip('/')}/static/covers/default_course.png"

                response_data.append({
                    "id": c.id,
                    "type": "course",
                    "title": c.title,
                    "author": c.author,
                    "description": c.description,
                    "cover_url": course_cover,
                    "file_url": None,
                    "file_size": None,
                    "tags": list(course_tags),
                    "category_id": c.category_id
                })
                

        return jsonify(response_data), 200
    
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@materials_bp.route('/tags', methods=['GET'])
@login_required
def get_all_materials_tags():
    """
    Возвращает список всех существующих тегов в алфавитном порядке
    """
    try:
        # вытаскиваем все теги из базы и сортируем по алфавиту для красоты
        all_tags = Tag.query.order_by(Tag.name.asc()).all()

        # формируем список объектов
        result = [{"id": tag.id, "name": tag.name} for tag in all_tags]

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==============================================================================
# 2. ЗАГРУЗКА МАТЕРИАЛА
# ==============================================================================
@materials_bp.route('', methods=['POST'])
@admin_required
def upload_material():
    """
    Эндпоинт загрузки материалов с опциональной мгновенной привязкой к модулю.
    """
    try:
        material_type = request.form.get('type')  # 'book' или 'video'
        title = request.form.get('title')
        author = request.form.get('author', '')
        description = request.form.get('description', '')
        category_id = request.form.get('category_id')
        tags_raw = request.form.get('tags', '')
        module_id = request.form.get('module_id')

        if not material_type or not title or not category_id:
            return jsonify({"status": "error", "message": "Поля type, title и category_id обязательны"}), 400

        if material_type not in ['book', 'video']:
            return jsonify({"status": "error", "message": "Неверный тип материала. Ожидается 'book' или 'video'"}), 400

        category = Category.query.get(category_id)
        if not category:
            return jsonify({"status": "error", "message": "Указанная категория не существует"}), 404

        if module_id:
            from MaxLuc.app.models import CourseModule
            module = CourseModule.query.get(module_id)
            if not module:
                return jsonify({"status": "error", "message": "Указанный модуль курса не найден"}), 404

        file_obj = request.files.get('file')
        cover_obj = request.files.get('cover')

        if not file_obj and material_type == 'book':
            return jsonify({"status": "error", "message": "Файл книги (PDF) обязателен для загрузки"}), 400

        cover_path = None
        if cover_obj:
            cover_path = save_file(cover_obj, 'covers', ALLOWED_COVER_EXTENSIONS)

        if material_type == 'book':
            allowed_exts = ALLOWED_BOOK_EXTENSIONS
            subfolder = 'books'
        else:
            allowed_exts = ALLOWED_VIDEO_EXTENSIONS
            subfolder = 'videos'

        file_path = None
        file_size = 0
        if file_obj:
            file_path = save_file(file_obj, subfolder, allowed_exts)
            full_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file_path)
            file_size = os.path.getsize(full_path) // 1024  # В КБ

        new_material = Material(
            type=material_type,
            title=title,
            author=author,
            description=description,
            category_id=int(category_id),
            file_url=file_path,
            cover_url=cover_path,
            file_size=file_size
        )
        db.session.add(new_material)

        if tags_raw:
            tag_list = [t.strip() for t in tags_raw.split(',') if t.strip()]
            for tag_name in tag_list:
                tag = Tag.query.filter_by(name=tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.session.add(tag)
                new_material.tags.append(tag)

        db.session.flush()

        if module_id:
            sort_order_val = request.form.get('sort_order', 0)
            new_link = CourseModuleMaterial(
                module_id=int(module_id),
                material_id=new_material.id,
                sort_order=int(sort_order_val)
            )
            db.session.add(new_link)

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Материал '{title}' успешно загружен и добавлен в модуль." if module_id else f"Материал '{title}' успешно загружен в общий каталог.",
            "material": material_schema.dump(new_material)
        }), 201

    except ValueError as val_err:
        return jsonify({"status": "error", "message": str(val_err)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# ==============================================================================
# 3. ПРОСМОТР И СКАЧИВАНИЕ
# ==============================================================================
@materials_bp.route('/<int:material_id>/download', methods=['GET'])
@login_required
def download_material(material_id):
    """Отдает файл книги, фиксирует скачивание и закрывает прогресс"""
    try:
        material = Material.query.get_or_404(material_id)

        if material.type != 'book' or not material.file_url:
            return jsonify({"status": "error", "message": "Этот материал недоступен для скачивания"}), 400

        user_id = int(get_jwt_identity())

        log_entry = DownloadHistory(
            user_id=user_id,
            material_id=material.id,
            accessed_at=datetime.utcnow()
        )
        db.session.add(log_entry)

        linked_modules = CourseModuleMaterial.query.filter_by(material_id=material.id).all()
        for link in linked_modules:
            existing_progress = UserCourseProgress.query.filter_by(
                user_id=user_id, module_id=link.module_id, material_id=material.id
            ).first()

            if not existing_progress:
                new_progress = UserCourseProgress(
                    user_id=user_id, module_id=link.module_id, material_id=material.id,
                    is_completed=True, completed_at=datetime.utcnow()
                )
                db.session.add(new_progress)
            elif not existing_progress.is_completed:
                existing_progress.is_completed = True
                existing_progress.completed_at = datetime.utcnow()

        db.session.commit()

        directory = os.path.join(current_app.config['UPLOAD_FOLDER'], os.path.dirname(material.file_url))
        filename = os.path.basename(material.file_url)

        return send_from_directory(
            directory=directory,
            path=filename,
            as_attachment=True,
            download_name=secure_filename(f"{material.title}.pdf")
        )

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@materials_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_material_item(id):
    """Получение детальной информации об одном материале"""
    material = Material.query.get_or_404(id)
    data = material_schema.dump(material)

    data['file_size'] = (material.file_size or 0) * 1024
    data['tags'] = [tag.name for tag in material.tags]

    # чистые относительные пути для Сани
    data['file_url'] = f"/uploads/{material.file_url}" if material.file_url else '#'
    data['cover_url'] = f"/uploads/{material.cover_url}" if material.cover_url else None

    return jsonify(data), 200


@materials_bp.route('/<int:material_id>/download', methods=['POST'])
@login_required
def log_material_access(material_id):
    """Фиксирует просмотр видео или доступ к книге Саней через POST"""
    try:
        material = Material.query.get_or_404(material_id)
        user_id = int(get_jwt_identity())

        log_entry = DownloadHistory(
            user_id=user_id,
            material_id=material.id,
            accessed_at=datetime.utcnow()
        )
        db.session.add(log_entry)

        linked_modules = CourseModuleMaterial.query.filter_by(material_id=material.id).all()
        for link in linked_modules:
            existing_progress = UserCourseProgress.query.filter_by(
                user_id=user_id, module_id=link.module_id, material_id=material.id
            ).first()

            if not existing_progress:
                new_progress = UserCourseProgress(
                    user_id=user_id, module_id=link.module_id, material_id=material.id,
                    is_completed=True, completed_at=datetime.utcnow()
                )
                db.session.add(new_progress)
            elif not existing_progress.is_completed:
                existing_progress.is_completed = True
                existing_progress.completed_at = datetime.utcnow()

        db.session.commit()
        return jsonify({"status": "success", "message": "Доступ зафиксирован, прогресс обновлен."}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500

