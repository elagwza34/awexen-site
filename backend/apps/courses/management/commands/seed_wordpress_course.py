from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.audit.services import record_audit
from apps.courses.models import Course, CourseInstructor, CourseVersion, Lesson, Module
from apps.courses.services import publish_course_version
from apps.organizations.models import Organization


COURSE_SLUG = "wordpress-foundations"
COURSE_PRICE = Decimal("1500.00")
SEED_ACTOR_EMAIL = "lms-seeder@internal.awexen"

MODULES = [
    {
        "title": "مقدمة إلى WordPress",
        "description": "فهم المنصة وتجهيز بيئة العمل قبل بناء الموقع.",
        "lessons": [
            {
                "title": "ما هو WordPress؟",
                "summary": "الفرق بين WordPress.com وWordPress.org ومتى تستخدم كلًا منهما.",
                "content": "ووردبريس نظام إدارة محتوى مفتوح المصدر يتيح إنشاء المواقع والمدونات والمتاجر. في هذا الدرس ستتعرف على مكوناته الأساسية والفرق بين الاستضافة الذاتية والخدمة المستضافة.",
                "completion_rule": Lesson.CompletionRule.VIEW,
                "duration_seconds": 600,
            },
            {
                "title": "الدومين والاستضافة وSSL",
                "summary": "اختيار البنية المناسبة لتشغيل موقع آمن ومستقر.",
                "content": "تعرف على وظيفة اسم النطاق والاستضافة وشهادة SSL، والمعايير العملية لاختيار الاستضافة: الأداء، النسخ الاحتياطي، الدعم، موقع الخادم وإمكانية التوسع.",
                "duration_seconds": 900,
            },
            {
                "title": "تثبيت WordPress والتعرف على لوحة التحكم",
                "summary": "تنفيذ التثبيت وضبط الإعدادات العامة والروابط الدائمة.",
                "content": "بعد التثبيت راجع اسم الموقع والمنطقة الزمنية واللغة والروابط الدائمة، ثم تعرف على الصفحات والمقالات والوسائط والمستخدمين والإعدادات.",
                "duration_seconds": 1200,
            },
        ],
    },
    {
        "title": "بناء هيكل الموقع",
        "description": "إنشاء المحتوى والقوائم واختيار القالب المناسب.",
        "lessons": [
            {
                "title": "الصفحات والمقالات والتصنيفات",
                "summary": "تنظيم أنواع المحتوى بطريقة تسهل الإدارة والبحث.",
                "content": "استخدم الصفحات للمحتوى الثابت والمقالات للمحتوى المتجدد. أنشئ تصنيفات واضحة، وتجنب التكرار، واكتب رابطًا مختصرًا ووصفًا مناسبًا لكل محتوى.",
                "duration_seconds": 900,
            },
            {
                "title": "اختيار القالب وتخصيص الهوية",
                "summary": "معايير اختيار قالب سريع ومتجاوب وقابل للصيانة.",
                "content": "اختبر القالب على الهاتف، راجع توافقه مع المحرر والإضافات، ثم اضبط الألوان والخطوط والشعار من إعدادات الهوية بدل تعديل ملفات القالب مباشرة.",
                "duration_seconds": 1200,
            },
            {
                "title": "القوائم والرأس والتذييل",
                "summary": "بناء تنقل واضح يساعد الزائر على الوصول للمحتوى.",
                "content": "أنشئ قائمة رئيسية قصيرة، ورتب الروابط حسب أولوية المستخدم. أضف بيانات التواصل والسياسات والروابط المهمة في التذييل.",
                "duration_seconds": 750,
            },
        ],
    },
    {
        "title": "الإضافات والوظائف الأساسية",
        "description": "إضافة الوظائف المطلوبة من غير تحميل الموقع بإضافات غير ضرورية.",
        "lessons": [
            {
                "title": "اختيار الإضافات بأمان",
                "summary": "تقييم الإضافة قبل تثبيتها وتقليل التعارضات.",
                "content": "اختر إضافات محدثة ومن ناشرين موثوقين، وراجع التوافق والتقييمات والدعم. لا تثبت إضافتين تؤديان الوظيفة نفسها، واحذف أي إضافة غير مستخدمة.",
                "duration_seconds": 900,
            },
            {
                "title": "إنشاء نموذج تواصل",
                "summary": "بناء نموذج بسيط واختبار تسليم الرسائل.",
                "content": "أنشئ الحقول الضرورية فقط، أضف حماية من الرسائل المزعجة، واضبط رسالة النجاح. اختبر الإرسال من الهاتف وتأكد من وصول البريد.",
                "duration_seconds": 750,
            },
            {
                "title": "أساسيات تحسين محركات البحث",
                "summary": "تهيئة العناوين والروابط والمحتوى لمحركات البحث.",
                "content": "اكتب عنوانًا واضحًا ووصفًا مناسبًا، استخدم بنية عناوين صحيحة، حسّن أسماء الصور والنص البديل، وأنشئ خريطة موقع قابلة للفهرسة.",
                "duration_seconds": 1200,
            },
        ],
    },
    {
        "title": "الأداء والأمان والإطلاق",
        "description": "تجهيز الموقع للنشر ثم الحفاظ عليه بعد الإطلاق.",
        "lessons": [
            {
                "title": "النسخ الاحتياطي والتحديثات",
                "summary": "وضع خطة استعادة وتحديث آمنة.",
                "content": "فعّل نسخًا احتياطية دورية خارج الخادم، واختبر الاستعادة. خذ نسخة قبل تحديث القالب أو الإضافات، وراجع الموقع بعد كل تحديث.",
                "duration_seconds": 900,
            },
            {
                "title": "تسريع الموقع وتحسين الصور",
                "summary": "تقليل زمن التحميل من خلال الصور والكاش والموارد.",
                "content": "اضغط الصور واختر المقاسات المناسبة، فعّل الكاش، قلل الخطوط والسكربتات غير المستخدمة، واختبر الصفحات الأساسية على اتصال هاتف محمول.",
                "duration_seconds": 1200,
            },
            {
                "title": "قائمة مراجعة ما قبل الإطلاق",
                "summary": "اختبار نهائي للمحتوى والروابط والنماذج والأمان.",
                "content": "راجع الروابط والقوائم والنماذج وصفحة 404 وسياسات الخصوصية، اختبر الهاتف، تأكد من HTTPS والنسخ الاحتياطي، ثم راقب الأخطاء والأداء بعد النشر.",
                "duration_seconds": 900,
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Create the published Arabic WordPress foundations demo course."

    @transaction.atomic
    def handle(self, *args, **options):
        organization, _ = Organization.objects.get_or_create(
            slug="awexen",
            defaults={"name": "Awexen"},
        )
        actor = User.objects.filter(email=SEED_ACTOR_EMAIL).first()
        if actor is None:
            actor = User.objects.create_user(
                email=SEED_ACTOR_EMAIL,
                full_name="Awexen Learning Team",
                is_active=False,
                email_verified=True,
            )

        existing = Course.objects.filter(organization=organization, slug=COURSE_SLUG).first()
        if existing is not None:
            if existing.price <= 0:
                existing.price = COURSE_PRICE
                existing.currency = "EGP"
                existing.save(update_fields=["price", "currency", "updated_at"])
            self.stdout.write(self.style.WARNING(f"Demo course already exists: {existing.id}"))
            return

        course = Course.objects.create(
            organization=organization,
            slug=COURSE_SLUG,
            title="أساسيات WordPress: من الصفر إلى إطلاق موقعك",
            short_description="كورس عملي لبناء موقع WordPress وإعداده وتأمينه وتجهيزه للإطلاق.",
            price=COURSE_PRICE,
            currency="EGP",
            owner=actor,
        )
        version = CourseVersion.objects.create(
            course=course,
            version_number=1,
            title=course.title,
            short_description=course.short_description,
            description="مسار عربي تطبيقي يبدأ من اختيار الاستضافة وينتهي بإطلاق موقع WordPress سريع وآمن.",
            language="ar",
            difficulty="beginner",
            estimated_minutes=180,
            learning_outcomes="إنشاء موقع WordPress، تنظيم المحتوى، اختيار القالب والإضافات، تطبيق أساسيات الأمان والأداء.",
            requirements="حاسوب واتصال بالإنترنت. لا يشترط وجود خبرة برمجية.",
            target_audience="المبتدئون وأصحاب المشروعات وصناع المحتوى.",
            change_notes="الإصدار التجريبي الأول.",
            created_by=actor,
        )
        CourseInstructor.objects.create(course_version=version, instructor=actor, is_lead=True)

        for module_order, module_data in enumerate(MODULES):
            module = Module.objects.create(
                course_version=version,
                title=module_data["title"],
                description=module_data["description"],
                sort_order=module_order,
                status=Module.Status.PUBLISHED,
                created_by=actor,
            )
            for lesson_order, lesson_data in enumerate(module_data["lessons"]):
                Lesson.objects.create(
                    module=module,
                    title=lesson_data["title"],
                    summary=lesson_data["summary"],
                    content=lesson_data["content"],
                    content_type=Lesson.ContentType.TEXT,
                    duration_seconds=lesson_data["duration_seconds"],
                    sort_order=lesson_order,
                    status=Lesson.Status.PUBLISHED,
                    is_required=True,
                    weight=1,
                    completion_rule=lesson_data.get("completion_rule", Lesson.CompletionRule.MANUAL),
                    created_by=actor,
                )

        publish_course_version(version=version, actor=actor, request_id="seed-wordpress-course")
        record_audit(
            action="course.demo_seeded",
            target=course,
            actor=actor,
            organization=organization,
            request_id="seed-wordpress-course",
            metadata={"modules": len(MODULES), "lessons": sum(len(item["lessons"]) for item in MODULES)},
        )
        self.stdout.write(self.style.SUCCESS(f"Created WordPress demo course: {course.id}"))
