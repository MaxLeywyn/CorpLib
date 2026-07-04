from flask import Blueprint, jsonify, request
from MaxLuc.app.models import Course, CourseModule, CourseModuleMaterial, UserCourseProgress, Material
from MaxLuc.app.schemas import course_schema
from MaxLuc.app.extensions import db
from flask_jwt_extended import get_jwt_identity

# Импортируем твои обновленные декораторы безопасности
from MaxLuc.app.utils.decorators import login_required

courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')


@courses_bp.route('/<int:id>', methods=['GET'])
@login_required  # Теперь доступ только для авторизованных пользователей
def get_course_detail(id):
    """
    Возвращает базовую информацию о курсе
    """
    course = Course.query.get_or_404(id)
    return jsonify(course_schema.dump(course)), 200


@courses_bp.route('/<int:course_id>/progress', methods=['GET'])
@login_required  # Защищаем эндпоинт
def get_course_progress(course_id):
    """
    Вычисляет процент прохождения курса для ТЕКУЩЕГО авторизованного сотрудника
    """
    try:
        # ИЗМЕНЕНО: Безопасно вытаскиваем ID юзера прямо из JWT-токена
        user_id = int(get_jwt_identity())

        total_materials_query = db.session.query(CourseModuleMaterial.material_id) \
            .join(CourseModule, CourseModule.id == CourseModuleMaterial.module_id) \
            .filter(CourseModule.course_id == course_id)

        total_count = total_materials_query.count()

        if total_count == 0:
            return jsonify({
                "course_id": course_id,
                "user_id": user_id,
                "progress_percent": 0,
                "completed_count": 0,
                "total_count": 0
            }), 200

        course_material_ids = [item.material_id for item in total_materials_query.all()]

        # Считаем, сколько из этих конкретных материалов пользователь отметил как пройденные
        completed_count = UserCourseProgress.query.filter(
            UserCourseProgress.user_id == user_id,
            UserCourseProgress.material_id.in_(course_material_ids),
            UserCourseProgress.is_completed == True
        ).count()

        # Считаем итоговый процент
        progress_percent = round((completed_count / total_count) * 100, 1)

        return jsonify({
            "status": "success",
            "course_id": course_id,
            "user_id": user_id,
            "analytics": {
                "total_materials_in_course": total_count,
                "completed_by_user": completed_count,
                "progress_percent": progress_percent
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# -----------------   МОДУЛИ КУРСА -----------------

@courses_bp.route('/<int:course_id>/structure', methods=['GET'])
@login_required
def get_course_structure(course_id):
    """
    Возвращает структуру курса (Модули -> Материалы) вместе с прогрессом текущего пользователя
    """
    try:

        user_id = int(get_jwt_identity())

        course = Course.query.get(course_id)
        if not course:
            return jsonify({"status": "error", "message": "Курс не найден"}), 404

        # Весь прогресс пользователя по этому курсу, чтобы не делать запросы в цикле
        # Словарь вида: {(module_id, material_id): is_completed}
        user_progress = {}
        progress_records = UserCourseProgress.query.filter_by(user_id=user_id).all()
        for pr in progress_records:
            user_progress[(pr.module_id, pr.material_id)] = pr.is_completed

        # Дерево курса
        modules_data = []
        for module in course.modules:

            materials_in_module = []
            for cmm in module.materials:
                # Достаем сам материал
                mat = Material.query.get(cmm.material_id)
                if mat:
                    # Чек прогресса по словарю
                    is_completed = user_progress.get((module.id, mat.id), False)

                    materials_in_module.append({
                        "id": mat.id,
                        "title": mat.title,
                        "type": mat.type,
                        "author": mat.author,
                        "file_size": mat.file_size,
                        "is_completed": is_completed
                    })

            modules_data.append({
                "id": module.id,
                "title": module.title,
                "sort_order": module.sort_order,
                "materials": materials_in_module
            })

        # Прогресс курса для вывода красивого статус-бара на фронте
        total_materials = sum(len(m["materials"]) for m in modules_data)
        completed_materials = sum(sum(1 for mat in m["materials"] if mat["is_completed"]) for m in modules_data)

        progress_percent = 0
        if total_materials > 0:
            progress_percent = round((completed_materials / total_materials) * 100, 1)

        return jsonify({
            "course_id": course.id,
            "title": course.title,
            "description": course.description,
            "progress": {
                "total_lessons": total_materials,
                "completed_lessons": completed_materials,
                "percent": progress_percent
            },
            "modules": modules_data
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



