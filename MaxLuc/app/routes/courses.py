from flask import Blueprint, jsonify, request
from MaxLuc.app.models import Course, CourseModule, CourseModuleMaterial, UserCourseProgress
from MaxLuc.app.schemas import course_schema
from MaxLuc.app.extensions import db

courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')

@courses_bp.route('/<int:id>', methods=['GET'])
def get_course_detail(id):
    course = Course.query.get_or_404(id)
    return jsonify(course_schema.dump(course)), 200


@courses_bp.route('/<int:course_id>/progress/<int:user_id>', methods=['GET'])
def get_course_progress(course_id, user_id):
    """
    Вычисляет процент прохождения курса для конкретного сотрудника
    """
    try:
        # 1. Собираем ID всех материалов, которые входят в этот курс (через его модули)
        total_materials_query = db.session.query(CourseModuleMaterial.material_id) \
            .join(CourseModule, CourseModule.id == CourseModuleMaterial.module_id) \
            .filter(CourseModule.course_id == course_id)

        total_count = total_materials_query.count()

        # Если в курсе еще нет уроков, прогресс равен 0
        if total_count == 0:
            return jsonify({
                "course_id": course_id,
                "user_id": user_id,
                "progress_percent": 0,
                "completed_count": 0,
                "total_count": 0
            }), 200

        # Вытаскиваем чистый список ID материалов [1, 5, 12...]
        course_material_ids = [item.material_id for item in total_materials_query.all()]

        # 2. Считаем, сколько из этих конкретных материалов пользователь отметил как пройденные
        completed_count = UserCourseProgress.query.filter(
            UserCourseProgress.user_id == user_id,
            UserCourseProgress.material_id.in_(course_material_ids),
            UserCourseProgress.is_completed == True
        ).count()

        # 3. Считаем итоговый процент (формула: (выполнено / всего) * 100)
        progress_percent = round((completed_count / total_count) * 100, 1)

        return jsonify({
            "status": "success",
            "course_id": course_id,
            "user_id": user_id,
            "analytics": {
                "total_materials_in_course": total_count,
                "completed_by_user": completed_count,
                "progress_percent": progress_percent  # Выдаст, например, 45.5%
            }
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500