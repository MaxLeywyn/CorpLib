import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from werkzeug.utils import secure_filename
from sqlalchemy import or_
from flask_jwt_extended import get_jwt_identity

from MaxLuc.app.extensions import db
from MaxLuc.app.models import Material, Tag, DownloadHistory, CourseModuleMaterial, UserCourseProgress, Category
from MaxLuc.app.schemas import material_schema, materials_schema
from MaxLuc.app.utils.decorators import admin_required, login_required

materials_bp = Blueprint('materials', __name__, url_prefix='/api/materials')

# допустимые расширения файлов по ТЗ
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

    # Генерируем уникальное имя, чтобы избежать коллизий
    ext = file_obj.filename.rsplit('.', 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"

    # Создаем папку, если её нет
    target_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], subfolder)
    os.makedirs(target_dir, exist_ok=True)

    file_path = os.path.join(target_dir, unique_name)
    file_obj.save(file_path)

    # Возвращаем относительный путь для сохранения в БД
    return f"{subfolder}/{unique_name}"



@materials_bp.route('', methods=['GET'])
@login_required
def get_materials():
    """
    Каталог материалов с фильтрацией по типу, категориям, тегам и поиску
    """
    try:
        query = Material.query

        # Фильтр по типу контента (book / video)
        mat_type = request.args.get('type')
        if mat_type:
            query = query.filter(Material.type == mat_type)

        # Фильтр по категории
        category_id = request.args.get('category_id')
        if category_id:
            query = query.filter(Material.category_id == category_id)

        # Фильтр по тегу (связь Many-to-Many)
        tag_name = request.args.get('tag')
        if tag_name:
            query = query.join(Material.tags).filter(Tag.name == tag_name)

        #поиск по подстроке (название, автор, описание)
        search = request.args.get('search')
        if search:
            search_fmt = f"%{search}%"
            query = query.filter(
                or_(
                    Material.title.ilike(search_fmt),
                    Material.author.ilike(search_fmt),
                    Material.description.ilike(search_fmt)
                )
            )

        materials = query.all()
        return jsonify(materials_schema.dump(materials)), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@materials_bp.route('', methods=['POST'])
@admin_required
def upload_material():
    """
    Эндпоинт загрузки материалов.
    Если передан module_id, материал сразу привязывается к указанному модулю курса.
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
            from MaxLuc.app.models import CourseModule  # Локальный импорт во избежание круговых зависимостей
            module = CourseModule.query.get(module_id)
            if not module:
                return jsonify({"status": "error", "message": "Указанный модуль курса не найден"}), 404

        # Обработка файлов из request.files
        file_obj = request.files.get('file')
        cover_obj = request.files.get('cover')

        if not file_obj and material_type == 'book':
            return jsonify({"status": "error", "message": "Файл книги (PDF) обязателен для загрузки"}), 400

        # Сохраняем обложку, если она есть
        cover_path = None
        if cover_obj:
            cover_path = save_file(cover_obj, 'covers', ALLOWED_COVER_EXTENSIONS)

        # Сохраняем основной файл
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

        #объект материала
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

        # Обработка тегов
        if tags_raw:
            tag_list = [t.strip() for t in tags_raw.split(',') if t.strip()]
            for tag_name in tag_list:
                tag = Tag.query.filter_by(name=tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.session.add(tag)
                new_material.tags.append(tag)

        #генерируем ID материала внутри текущей транзакции
        db.session.flush()

        if module_id:
            sort_order_val = request.form.get('sort_order', 0)

            new_link = CourseModuleMaterial(
                module_id=int(module_id),
                material_id=new_material.id,
                sort_order=int(sort_order_val)
            )
            db.session.add(new_link)

        # Финальный коммит (Материал + Теги + Связь с модулем)
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


@materials_bp.route('/<int:material_id>/download', methods=['GET'])
@login_required
def download_material(material_id):
    """
    Отдает файл пользователю, фиксирует скачивание в истории и закрывает прогресс в модулях
    """
    try:
        material = Material.query.get_or_404(material_id)

        if material.type != 'book' or not material.file_url:
            return jsonify({"status": "error", "message": "Этот материал недоступен для скачивания"}), 400

        user_id = int(get_jwt_identity())

        # записываем факт скачивания в общую историю доступа
        log_entry = DownloadHistory(
            user_id=user_id,
            material_id=material.id,
            accessed_at=datetime.utcnow()
        )
        db.session.add(log_entry)

        linked_modules = CourseModuleMaterial.query.filter_by(material_id=material.id).all()

        for link in linked_modules:
            existing_progress = UserCourseProgress.query.filter_by(
                user_id=user_id,
                module_id=link.module_id,
                material_id=material.id
            ).first()

            if not existing_progress:
                new_progress = UserCourseProgress(
                    user_id=user_id,
                    module_id=link.module_id,
                    material_id=material.id,
                    is_completed=True,
                    completed_at=datetime.utcnow()
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
    """
    Получение детальной информации об одном материале
    """
    material = Material.query.get_or_404(id)

    data = material_schema.dump(material)

    data['file_size'] = (material.file_size or 0) * 1024

    data['tags'] = [tag.name for tag in material.tags]

    base_url = request.host_url.rstrip('/')

    if material.file_url:
        data['file_url'] = f"{base_url}/api/materials/static/{material.file_url}"
    else:
        data['file_url'] = '#'

    if material.cover_url:
        data['cover_url'] = f"{base_url}/api/materials/static/{material.cover_url}"
    else:
        data['cover_url'] = None

    return jsonify(data), 200


@materials_bp.route('/<int:material_id>/download', methods=['POST'])
@login_required
def log_material_access(material_id):
    """
    Эндпоинт вызывается Саней через POST.
    Фиксирует просмотр/скачивание в истории и закрывает прогресс в модулях.
    """
    try:
        material = Material.query.get_or_404(material_id)
        user_id = int(get_jwt_identity())

        #записываем факт доступа в общую историю
        log_entry = DownloadHistory(
            user_id=user_id,
            material_id=material.id,
            accessed_at=datetime.utcnow()
        )
        db.session.add(log_entry)

        # Ищем модули, где есть этот материал
        linked_modules = CourseModuleMaterial.query.filter_by(material_id=material.id).all()

        # Автоматически проставляем выполнение
        for link in linked_modules:
            existing_progress = UserCourseProgress.query.filter_by(
                user_id=user_id,
                module_id=link.module_id,
                material_id=material.id
            ).first()

            if not existing_progress:
                new_progress = UserCourseProgress(
                    user_id=user_id,
                    module_id=link.module_id,
                    material_id=material.id,
                    is_completed=True,
                    completed_at=datetime.utcnow()
                )
                db.session.add(new_progress)
            elif not existing_progress.is_completed:
                existing_progress.is_completed = True
                existing_progress.completed_at = datetime.utcnow()

        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Доступ к материалу зафиксирован, прогресс обновлен."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500



#РАЗДАЧА СТАТИКИ
@materials_bp.route('/static/<path:filename>', methods=['GET'])
def serve_uploaded_file(filename):
    """
    Эндпоинт для физической отдачи файлов.
    """

    return send_from_directory(
        current_app.config['UPLOAD_FOLDER'],
        filename,
        conditional=True
    )
