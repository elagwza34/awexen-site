import type { InboxField } from "./InboxManager";

const yesNo = { yes: "نعم", no: "لا", true: "نعم", false: "لا" };

export const initiativeFields: InboxField[] = [
  { key: "applicant_name", fallbackKey: "name", label: "الاسم", section: "١. بيانات التواصل" },
  { key: "whatsapp_number", fallbackKey: "phone", label: "رقم واتساب", kind: "phone" },
  { key: "email", label: "البريد الإلكتروني", kind: "email" },
  { key: "city", label: "المدينة" },
  { key: "business_name", label: "اسم المشروع", section: "٢. بيانات المشروع" },
  { key: "business_sector", fallbackKey: "business_type", label: "مجال المشروع", options: {
    restaurants_cafes: "مطاعم وكافيهات", clothing_fashion: "ملابس وأزياء", beauty_personal_care: "تجميل وعناية شخصية",
    education_training: "تعليم وتدريب", professional_services_consulting: "خدمات مهنية واستشارات", trade_products: "تجارة ومنتجات",
    industry_factories: "صناعة ومصانع", real_estate_contracting: "عقارات ومقاولات", tourism_travel: "سياحة وسفر",
    health_medical_services: "صحة وخدمات طبية", other: "أخرى",
  } },
  { key: "custom_business_sector", label: "تفاصيل المجال الآخر" },
  { key: "business_description", label: "وصف المشروع", wide: true },
  { key: "business_age", label: "عمر المشروع", options: {
    less_than_6_months: "أقل من 6 شهور", "6_months_to_1_year": "من 6 شهور لسنة",
    "1_to_3_years": "من سنة إلى 3 سنوات", more_than_3_years: "أكثر من 3 سنوات",
  } },
  { key: "social_media_url", label: "رابط السوشيال ميديا", kind: "url" },
  { key: "target_audience", label: "الجمهور المستهدف", section: "٣. الجمهور والتحديات", wide: true },
  { key: "biggest_challenge", label: "أكبر تحدي", wide: true, options: {
    difficulty_reaching_new_customers: "صعوبة الوصول لعملاء جدد", low_sales: "ضعف المبيعات",
    no_professional_online_presence: "عدم وجود حضور احترافي على الإنترنت",
    difficulty_showcasing_products_services: "صعوبة عرض المنتجات والخدمات",
    difficulty_receiving_orders_bookings: "صعوبة استقبال الطلبات أو الحجوزات", other: "تحديات أخرى",
  } },
  { key: "custom_challenge", label: "تفاصيل التحدي الآخر", wide: true },
  { key: "has_website", label: "هل يوجد موقع حالي؟", options: yesNo },
  { key: "website_url", label: "رابط الموقع الحالي", kind: "url" },
  { key: "website_necessity", fallbackKey: "how_website_helps", label: "لماذا يحتاج المشروع إلى موقع؟", section: "٤. أهداف الموقع", wide: true },
  { key: "website_objective", label: "الهدف من الموقع", options: {
    showcase_company_services: "عرض الشركة وخدماتها بشكل احترافي", showcase_products_receive_orders: "عرض المنتجات واستقبال طلبات الشراء",
    receive_bookings_service_requests: "استقبال الحجوزات أو طلبات الخدمات", showcase_portfolio_projects: "عرض سابقة الأعمال والمشاريع",
    attract_leads_inquiries: "جذب عملاء محتملين واستفسارات جديدة", other: "هدف آخر",
  } },
  { key: "custom_website_objective", label: "تفاصيل الهدف الآخر", wide: true },
  { key: "six_month_goal", label: "هدف المشروع خلال 6 شهور", wide: true },
  { key: "content_readiness", label: "جاهزية المحتوى", section: "٥. الجاهزية والموافقة", options: {
    ready: "نعم، كل حاجة جاهزة", partial: "جاهز بشكل جزئي", not_ready: "لا، محتاج أجهز المحتوى",
  } },
  { key: "cooperation_readiness", label: "الاستعداد للتعاون مع الفريق", options: yesNo },
  { key: "terms_accepted", label: "الموافقة على الشروط والخصوصية", options: yesNo },
  { key: "terms_version", label: "نسخة الشروط" },
  { key: "submitted_at", fallbackKey: "created_at", label: "تاريخ تقديم الطلب" },
  { key: "status", label: "حالة الطلب", section: "متابعة الإدارة", options: { new: "جديد", contacted: "تم التواصل", accepted: "مقبول", rejected: "مرفوض" } },
  { key: "admin_notes", label: "ملاحظات الإدارة", wide: true },
];
