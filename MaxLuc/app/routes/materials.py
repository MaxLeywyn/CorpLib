from flask import Blueprint, request, jsonify
from MaxLuc.app.extensions import db
from MaxLuc.app.models import Material, Tag, DownloadHistory
from MaxLuc.app.schemas import material_schema, materials_schema

materials_bp = Blueprint('materials', __name__, url_prefix='/api/materials')


@materials_bp.route('', methods=['GET'])
def get_materials():
    query = Material.query

    mat_type = request.args.get('type')
    if mat_type:
        query = query.filter(Material.type == mat_type)

    category_id = request.args.get('category_id')
    if category_id:
        query = query.filter(Material.category_id == category_id)

    search = request.args.get('search')
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            db.or_(
                Material.title.ilike(search_fmt),
                Material.author.ilike(search_fmt),
                Material.description.ilike(search_fmt)
            )
        )

    materials = query.all()
    return jsonify(materials_schema.dump(materials)), 200


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