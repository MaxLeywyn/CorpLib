import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from MaxLuc.app.extensions import db
from MaxLuc.app.models import Material, Tag, DownloadHistory
from MaxLuc.app.schemas import material_schema, materials_schema
from sqlalchemy import or_


materials_bp = Blueprint('materials', __name__, url_prefix='/api/materials')


@materials_bp.route('', methods=['GET'])
def get_materials():
    """
    Каталог материалов с фильтрацией по типу, категориям, тегам и полнотекстовым поиском
    """
    try:
        query = Material.query

        # 1. Фильтр по типу контента (book / video)
        mat_type = request.args.get('type')
        if mat_type:
            query = query.filter(Material.type == mat_type)

        # 2. Фильтр по категории
        category_id = request.args.get('category_id')
        if category_id:
            query = query.filter(Material.category_id == category_id)

        # 3. НОВОЕ: Фильтр по тегу (делаем JOIN с таблицей тегов)
        tag_name = request.args.get('tag')
        if tag_name:
            query = query.join(Material.tags).filter(Tag.name == tag_name)

        # 4. Поиск по подстроке (Регистронезависимый)
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


@materials_bp.route('/<int:id>', methods=['GET'])
def get_material_item(id):
    material = Material.query.get_or_404(id)
    return jsonify(material_schema.dump(material)), 200


@materials_bp.route('', methods=['POST'])
def create_material():
    data = request.json
    try:
        new_material = Material(
            type=data['type'],
            title=data['title'],
            description=data.get('description'),
            category_id=data.get('category_id'),
            cover_url=data.get('cover_url'),
            file_url=data['file_url'],
            author=data.get('author'),
            file_size=data.get('file_size')
        )

        if 'tags' in data:
            for tag_name in data['tags']:
                tag = Tag.query.filter_by(name=tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.session.add(tag)
                new_material.tags.append(tag)

        db.session.add(new_material)
        db.session.commit()
        return jsonify(material_schema.dump(new_material)), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400


@materials_bp.route('/<int:id>/download', methods=['POST'])
def log_download(id):
    user_id = request.json.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID required"}), 400

    log_entry = DownloadHistory(user_id=user_id, material_id=id)
    db.session.add(log_entry)
    db.session.commit()
    return jsonify({"status": "success", "message": "Download history updated"}), 200

@materials_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file:
        filename = secure_filename(file.filename)

        current_dir = os.path.dirname(os.path.abspath(__file__)) # это папка routes
        app_dir = os.path.dirname(current_dir)
        upload_path = os.path.join(app_dir, 'static', 'uploads', filename)
        file.save(upload_path)

        file_size = os.path.getsize(upload_path)
        file_url = f"/static/uploads/{filename}"

        return jsonify({"status": "success", "message": "The file has been successfully saved to disk", "file_url": file_url, "file_size": file_size}), 201
    
