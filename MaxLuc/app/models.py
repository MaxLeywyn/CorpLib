from datetime import datetime
from MaxLuc.app.extensions import db

#таблица связи Многие-ко-Многим (Материал <-> Тег)
material_tags = db.Table('material_tags',
                         db.Column('material_id', db.Integer, db.ForeignKey('materials.id', ondelete='CASCADE'),
                                   primary_key=True),
                         db.Column('tag_id', db.Integer, db.ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
                         )


class CourseModuleMaterial(db.Model):
    __tablename__ = 'course_module_materials'
    module_id = db.Column(db.Integer, db.ForeignKey('course_modules.id', ondelete='CASCADE'), primary_key=True)
    material_id = db.Column(db.Integer, db.ForeignKey('materials.id', ondelete='CASCADE'), primary_key=True)
    sort_order = db.Column(db.Integer, nullable=False)

    __table_args__ = (db.UniqueConstraint('module_id', 'sort_order', name='uq_module_material_order'),)


class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    users = db.relationship('User', backref='role', lazy=True)


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='RESTRICT'), nullable=False)

    downloads = db.relationship('DownloadHistory', backref='user', lazy=True)
    progresses = db.relationship('UserCourseProgress', backref='user', lazy=True)


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    materials = db.relationship('Material', backref='category', lazy=True)
    courses = db.relationship('Course', backref='category', lazy=True)


class Tag(db.Model):
    __tablename__ = 'tags'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)


class Material(db.Model):
    __tablename__ = 'materials'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'))
    cover_url = db.Column(db.String(500))
    file_url = db.Column(db.String(500), nullable=False)
    author = db.Column(db.String(255))
    file_size = db.Column(db.BigInteger)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    tags = db.relationship('Tag', secondary=material_tags, backref=db.backref('materials', lazy='dynamic'))

    __table_args__ = (db.CheckConstraint("type IN ('book', 'video')", name='check_material_type'),)


class Course(db.Model):
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id', ondelete='SET NULL'))
    cover_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    modules = db.relationship('CourseModule', backref='course', lazy=True, order_by="CourseModule.sort_order")


class CourseModule(db.Model):
    __tablename__ = 'course_modules'
    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    sort_order = db.Column(db.Integer, nullable=False)

    materials = db.relationship('CourseModuleMaterial', backref='module', lazy=True,
                                order_by="CourseModuleMaterial.sort_order")

    __table_args__ = (db.UniqueConstraint('course_id', 'sort_order', name='uq_course_module_order'),)


class DownloadHistory(db.Model):
    __tablename__ = 'download_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    material_id = db.Column(db.Integer, db.ForeignKey('materials.id', ondelete='CASCADE'), nullable=False)
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow)


class UserCourseProgress(db.Model):
    __tablename__ = 'user_course_progress'
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('course_modules.id', ondelete='CASCADE'), primary_key=True)
    material_id = db.Column(db.Integer, db.ForeignKey('materials.id', ondelete='CASCADE'), primary_key=True)
    is_completed = db.Column(db.Boolean, default=False, nullable=False)
    completed_at = db.Column(db.DateTime)