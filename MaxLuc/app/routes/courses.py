from flask import Blueprint, jsonify, request
from MaxLuc.app.models import Course, CourseModule, CourseModuleMaterial, UserCourseProgress, Material, DownloadHistory, UserCourseProgress, Category
from MaxLuc.app.schemas import course_schema
from MaxLuc.app.extensions import db
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from MaxLuc.app.utils.decorators import login_required, admin_required


courses_bp = Blueprint('courses', __name__, url_prefix='/api/courses')


@courses_bp.route('/<int:id>', methods=['GET'])
@login_required
def get_course_detail(id):
    """
    Возвращает базовую информацию о курсе
    """
    course = Course.query.get_or_404(id)
    return jsonify(course_schema.dump(course)), 200


@courses_bp.route('/<int:course_id>/progress', methods=['GET'])
@login_required
def get_course_progress(course_id):
    """
    Вычисляет процент прохождения курса для ТЕКУЩЕГО авторизованного сотрудника
    """
    try:

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


        user_progress = {}
        progress_records = UserCourseProgress.query.filter_by(user_id=user_id).all()
        for pr in progress_records:
            user_progress[(pr.module_id, pr.material_id)] = pr.is_completed

        # модули курса
        modules_data = []
        for module in course.modules:

            materials_in_module = []
            for cmm in module.materials:
                # достаем сам материал
                mat = Material.query.get(cmm.material_id)
                if mat:
                    # чек прогресса по словарю
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

        # прогресс курса для вывода красивого статус-бара на фронте
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


# Предполагается, что courses_bp уже объявлен вверху файла
@courses_bp.route('/track', methods=['POST'])
@jwt_required()
def track_material_progress():
    """
    Эндпоинт для фиксации прохождения конкретного материала внутри курса/модуля.
    """
    try:
        user_id = int(get_jwt_identity())

        data = request.get_json() or {}
        course_id = data.get('course_id')
        module_id = data.get('module_id')
        material_id = data.get('material_id')

        if not course_id or not module_id or not material_id:
            return jsonify({
                "status": "error",
                "message": "Поля course_id, module_id и material_id обязательны для передачи"
            }), 400

        #существует ли вообще такая связка материала и модуля в базе
        link_exists = CourseModuleMaterial.query.filter_by(
            module_id=module_id,
            material_id=material_id
        ).first()

        if not link_exists:
            return jsonify({
                "status": "error",
                "message": "Указанный материал не принадлежит данному модулю"
            }), 404

        #не было ли это задание уже выполнено ранее
        progress = UserCourseProgress.query.filter_by(
            user_id=user_id,
            module_id=module_id,
            material_id=material_id
        ).first()

        if progress:
            if progress.is_completed:
                return jsonify({
                    "status": "success",
                    "message": "Материал уже был отмечен как пройденный ранее"
                }), 200


            progress.is_completed = True
            progress.completed_at = datetime.utcnow()
        else:

            new_progress = UserCourseProgress(
                user_id=user_id,
                module_id=module_id,
                material_id=material_id,
                is_completed=True,
                completed_at=datetime.utcnow()
            )
            db.session.add(new_progress)

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": "Прогресс по материалу успешно сохранен"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@courses_bp.route('', methods=['POST'])
@admin_required
def create_course():
    """
    Создание нового курса администратором с обязательным указанием категории
    """
    try:
        data = request.get_json() or {}
        title = data.get('title')
        description = data.get('description', '')
        category_id = data.get('category_id')

        # Валидация обязательных полей
        if not title or not category_id:
            return jsonify({
                "status": "error",
                "message": "Поля title (название) и category_id (ID категории) обязательны"
            }), 400

        from MaxLuc.app.models import Category


        category = Category.query.get(category_id)
        if not category:
            return jsonify({
                "status": "error",
                "message": f"Указанная категория с ID {category_id} не найдена"
            }), 404


        new_course = Course(
            title=title.strip(),
            description=description.strip(),
            category_id=int(category_id)
        )

        db.session.add(new_course)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Курс '{title}' успешно создан.",
            "course": course_schema.dump(new_course)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@courses_bp.route('/<int:course_id>/modules', methods=['POST'])
@admin_required
def create_module(course_id):
    """
    Добавление нового учебного модуля в существующий курс
    """
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"status": "error", "message": "Указанный курс не найден"}), 404

        data = request.get_json() or {}
        title = data.get('title')
        sort_order = data.get('sort_order', 0)

        if not title:
            return jsonify({"status": "error", "message": "Название модуля обязательно"}), 400

        new_module = CourseModule(
            course_id=course_id,
            title=title.strip(),
            sort_order=int(sort_order)
        )

        db.session.add(new_module)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Модуль '{title}' успешно добавлен в курс.",
            "module": {
                "id": new_module.id,
                "course_id": new_module.course_id,
                "title": new_module.title,
                "sort_order": new_module.sort_order
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500



@courses_bp.route('/modules/<int:module_id>/materials', methods=['POST'])
@admin_required
def attach_material_to_module(module_id):
    """
    Привязка существующего материала (из каталога) к конкретному модулю
    """
    try:
        module = CourseModule.query.get(module_id)
        if not module:
            return jsonify({"status": "error", "message": "Указанный модуль не найден"}), 404

        data = request.get_json() or {}
        material_id = data.get('material_id')

        if not material_id:
            return jsonify({"status": "error", "message": "Параметр material_id обязателен"}), 400

        material = Material.query.get(material_id)
        if not material:
            return jsonify({"status": "error", "message": "Указанный материал не найден в каталоге"}), 404

        # проверяем, не привязан ли этот материал к этому модулю уже сейчас
        existing_link = CourseModuleMaterial.query.filter_by(
            module_id=module_id,
            material_id=material_id
        ).first()

        if existing_link:
            return jsonify({
                "status": "error",
                "message": "Этот материал уже привязан к данному модулю"
            }), 400

        # создаем связь многие ко многим через промежуточную модель
        new_link = CourseModuleMaterial(
            module_id=module_id,
            material_id=material_id
        )

        db.session.add(new_link)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Материал '{material.title}' успешно добавлен в модуль '{module.title}'."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# ==============================================================================
# 3. РЕДАКТИРОВАНИЕ И УДАЛЕНИЕ (КУРСЫ И МОДУЛИ)
# ==============================================================================

@courses_bp.route('/<int:id>', methods=['PUT'])
@admin_required
def update_course(id):
    """
    Редактирование базовой информации о курсе (Название, описание, категория)
    """
    try:
        course = Course.query.get_or_404(id)
        data = request.get_json() or {}

        if 'title' in data:
            title = data.get('title', '').strip()
            if not title:
                return jsonify({"status": "error", "message": "Название курса не может быть пустым"}), 400
            course.title = title

        if 'description' in data:
            course.description = data.get('description', '').strip()

        if 'category_id' in data:
            category_id = data.get('category_id')
            from MaxLuc.app.models import Category
            category = Category.query.get(category_id)
            if not category:
                return jsonify({"status": "error", "message": f"Категория с ID {category_id} не найдена"}), 404
            course.category_id = int(category_id)

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Курс '{course.title}' успешно обновлен.",
            "course": course_schema.dump(course)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@courses_bp.route('/<int:id>', methods=['DELETE'])
@admin_required
def delete_course(id):
    """
    Полное удаление курса, его модулей, связей с материалами и прогресса пользователей
    """
    try:
        course = Course.query.get_or_404(id)

        module_ids = [module.id for module in course.modules]

        if module_ids:
            UserCourseProgress.query.filter(UserCourseProgress.module_id.in_(module_ids)).delete(
                synchronize_session=False)

            CourseModuleMaterial.query.filter(CourseModuleMaterial.module_id.in_(module_ids)).delete(
                synchronize_session=False)

            CourseModule.query.filter(CourseModule.id.in_(module_ids)).delete(synchronize_session=False)

        db.session.delete(course)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Курс '{course.title}' и все связанные с ним модули успешно удалены."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@courses_bp.route('/modules/<int:module_id>', methods=['PUT'])
@admin_required
def update_module(module_id):
    """
    Редактирование модуля (изменение названия или порядка сортировки)
    """
    try:
        module = CourseModule.query.get_or_404(module_id)
        data = request.get_json() or {}

        if 'title' in data:
            title = data.get('title', '').strip()
            if not title:
                return jsonify({"status": "error", "message": "Название модуля не может быть пустым"}), 400
            module.title = title

        if 'sort_order' in data:
            module.sort_order = int(data.get('sort_order', 0))

        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Модуль '{module.title}' успешно обновлен.",
            "module": {
                "id": module.id,
                "course_id": module.course_id,
                "title": module.title,
                "sort_order": module.sort_order
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@courses_bp.route('/modules/<int:module_id>', methods=['DELETE'])
@admin_required
def delete_module(module_id):
    """
    Удаление модуля, а также очистка его связей с материалами и прогресса пользователей
    """
    try:
        module = CourseModule.query.get_or_404(module_id)

        # удаляем прогресс пользователей, привязанный к этому модулю
        UserCourseProgress.query.filter_by(module_id=module_id).delete(synchronize_session=False)

        # удаляем связи материалов с этим модулем (сами материалы в каталоге остаются живы)
        CourseModuleMaterial.query.filter_by(module_id=module_id).delete(synchronize_session=False)

        # удаляем сам модуль
        db.session.delete(module)
        db.session.commit()

        return jsonify({
            "status": "success",
            "message": f"Модуль '{module.title}' успешно удален из курса."
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# --- Вкладка МОЁ ОБУЧЕНИЕ ---

@courses_bp.route('/my-learning', methods=['GET'])
@login_required
def get_my_learning():
    """
    Возвращает прогресс по курсам для авторизованного пользователя.
    Рассчитывает total_materials и completed_materials.
    """
    try:
        user_id = get_jwt_identity()

        completed_material_ids = set(
            row[0] for row in db.session.query(UserCourseProgress.material_id)
            .filter(UserCourseProgress.user_id == user_id, UserCourseProgress.is_completed == True)
            .all()
        )

        all_courses = Course.query.all()
        result = []

        for course in all_courses:
            course_material_ids = []
            for module in course.modules:
                for cmm in module.materials:
                    course_material_ids.append(cmm.material_id)

            total_materials = len(course_material_ids)

            if total_materials == 0:
                continue

            completed_count = sum(1 for m_id in course_material_ids if m_id in completed_material_ids)

            result.append({
                "id": course.id,
                "title": course.title,
                "description": course.description,
                "category_id": course.category_id,
                "category_name": course.category.name if course.category else "Общее",
                "completed_materials": completed_count,
                "total_materials": total_materials
            })

        return jsonify(result), 200

    except Exception as e:
        import traceback
        print(f"\n!!! Ошибка в эндпоинте my-learning: {e}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500