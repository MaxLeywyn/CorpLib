import os
import sys

# Корректная кодировка для Windows
os.environ["PGCLIENTENCODING"] = "utf-8"
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from MaxLuc.app import create_app
from MaxLuc.app.extensions import db
from MaxLuc.app.models import (
    User, Role, Category, Material,
    Course, CourseModule, CourseModuleMaterial, UserCourseProgress
)


def seed_full_course():
    app = create_app()
    with app.app_context():
        print("====== НАЧАЛО ГЕНЕРАЦИИ УЧЕБНОГО КУРСА ======")

        # 1. Создаем базовую роль и пользователя по твоей новой схеме
        # 1. Создаем роли из ТЗ фронтенда (если их еще нет)
        roles_to_create = ["employee", "admin", "superuser"]
        roles_dict = {}

        for r_name in roles_to_create:
            role = Role.query.filter_by(name=r_name).first()
            if not role:
                role = Role(name=r_name)
                db.session.add(role)
                db.session.flush()
                print(f"[+] Создана роль: {r_name}")
            roles_dict[r_name] = role.id

        # Данные пользователей из ТЗ фронтенда
        test_users_data = [
            {"login": "user@company.com", "password": "user123", "role": "employee", "name": "Иван Сотрудник"},
            {"login": "hr@company.com", "password": "hr123", "role": "admin", "name": "Ольга HR"},
            {"login": "root@company.com", "password": "root123", "role": "superuser", "name": "Алексей Суперюзер"}
        ]

        for u_data in test_users_data:
            user = User.query.filter_by(login=u_data["login"]).first()
            if not user:
                user = User(
                    login=u_data["login"],
                    # В реальном проекте тут должен быть werkzeug.security.generate_password_hash
                    # Для простоты соответствия фронту пока пишем строку (или хэш, если у тебя настроена валидация)
                    password_hash=u_data["password"],
                    full_name=u_data["name"],
                    role_id=roles_dict[u_data["role"]]
                )
                db.session.add(user)
                db.session.flush()
                print(f"[+] Создан пользователь: {user.login} ({u_data['name']})")

        # 2. Создаем категорию "Программирование"
        category = Category.query.filter_by(name="Программирование").first()
        if not category:
            category = Category(name="Программирование", description="Курсы и книги по разработке")
            db.session.add(category)
            db.session.flush()
            print("[+] Создана категория: Программирование")

        # 3. Создаем учебные материалы (лекции и видео)
        materials_data = [
            {"title": "Урок 1: Введение в Python", "type": "video", "url": "videos/intro.mp4"},
            {"title": "Урок 2: Переменные и типы данных", "type": "video", "url": "videos/vars.mp4"},
            {"title": "Шпаргалка по синтаксису (PDF)", "type": "book", "url": "docs/syntax.pdf"},
            {"title": "Урок 3: Условия и циклы", "type": "video", "url": "videos/loops.mp4"},
            {"title": "Урок 4: Функции и области видимости", "type": "video", "url": "videos/funcs.mp4"}
        ]

        created_materials = []
        for m_data in materials_data:
            material = Material.query.filter_by(file_url=m_data["url"]).first()
            if not material:
                material = Material(
                    title=m_data["title"],
                    type=m_data["type"],
                    file_url=m_data["url"],
                    category_id=category.id,
                    description=f"Тестовый материал для курса: {m_data['title']}",
                    file_size=1024 * 1024 * 5
                )
                db.session.add(material)
                db.session.flush()
                print(f"[+] Добавлен материал: {material.title}")
            created_materials.append(material)

        # 4. Создаем сам Курс
        course = Course.query.filter_by(title="Python для начинающих").first()
        if not course:
            course = Course(
                title="Python для начинающих",
                description="Базовый курс по автоматизации и разработке",
                category_id=category.id
            )
            db.session.add(course)
            db.session.flush()
            print(f"[+] Создан курс: {course.title}")
        else:
            print(f"[*] Курс '{course.title}' уже существует.")

        # 5. Создаем Модули и привязываем материалы
        mod1 = CourseModule.query.filter_by(course_id=course.id, title="Модуль 1. Старт").first()
        if not mod1:
            mod1 = CourseModule(course_id=course.id, title="Модуль 1. Старт", sort_order=1)
            db.session.add(mod1)
            db.session.flush()

            db.session.add(CourseModuleMaterial(module_id=mod1.id, material_id=created_materials[0].id, sort_order=1))
            db.session.add(CourseModuleMaterial(module_id=mod1.id, material_id=created_materials[1].id, sort_order=2))
            print("[+] Создан Модуль 1 с двумя уроками")
        else:
            print("[*] Модуль 1 уже существует.")

        mod2 = CourseModule.query.filter_by(course_id=course.id, title="Модуль 2. Логика").first()
        if not mod2:
            mod2 = CourseModule(course_id=course.id, title="Модуль 2. Логика", sort_order=2)
            db.session.add(mod2)
            db.session.flush()

            db.session.add(CourseModuleMaterial(module_id=mod2.id, material_id=created_materials[2].id, sort_order=1))
            db.session.add(CourseModuleMaterial(module_id=mod2.id, material_id=created_materials[3].id, sort_order=2))
            db.session.add(CourseModuleMaterial(module_id=mod2.id, material_id=created_materials[4].id, sort_order=3))
            print("[+] Создан Модуль 2 с тремя уроками")
        else:
            print("[*] Модуль 2 уже существует.")

        # 6. Симулируем прогресс сотрудника с учетом составного ключа (user_id, module_id, material_id)
        # Отмечаем Урок 1 и Урок 2 из Модуля 1 как выполненные
        for i in range(2):
            progress = UserCourseProgress.query.filter_by(
                user_id=user.id,
                module_id=mod1.id,
                material_id=created_materials[i].id
            ).first()
            if not progress:
                progress = UserCourseProgress(
                    user_id=user.id,
                    module_id=mod1.id,
                    material_id=created_materials[i].id,
                    is_completed=True
                )
                db.session.add(progress)

        print("[+] Симулирован прогресс: пользователь прошёл 2 урока из Модуля 1")

        db.session.commit()
        print("====== СИДИНГ КУРСА УСПЕШНО ЗАВЕРШЕН ======\n")
        print(f"Для проверки прогресса используй ID курса: {course.id} и ID пользователя: {user.id}")


if __name__ == '__main__':
    seed_full_course()