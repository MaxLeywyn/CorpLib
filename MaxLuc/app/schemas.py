from MaxLuc.app.extensions import ma
from MaxLuc.app.models import Tag, Material, CourseModuleMaterial, CourseModule, Course

class TagSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Tag

class MaterialSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Material
        include_fk = True
    tags = ma.Nested(TagSchema, many=True)

class CourseModuleMaterialSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = CourseModuleMaterial
        include_fk = True
    material_details = ma.Method("get_material_details")

    def get_material_details(self, obj):
        material = Material.query.get(obj.material_id)
        return MaterialSchema().dump(material) if material else None

class CourseModuleSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = CourseModule
        include_fk = True
    materials = ma.Nested(CourseModuleMaterialSchema, many=True)

class CourseSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Course
        include_fk = True
    modules = ma.Nested(CourseModuleSchema, many=True)

#инстансы для переиспользования в роутах
material_schema = MaterialSchema()
materials_schema = MaterialSchema(many=True)
course_schema = CourseSchema()
courses_schema = CourseSchema(many=True)