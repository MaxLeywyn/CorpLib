from flask import Blueprint, jsonify
from MaxLuc.app.models import Course
from MaxLuc.app.schemas import course_schema

courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')

@courses_bp.route('/<int:id>', methods=['GET'])
def get_course_detail(id):
    course = Course.query.get_or_404(id)
    return jsonify(course_schema.dump(course)), 200