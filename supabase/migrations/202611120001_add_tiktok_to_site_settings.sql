-- إضافة عمود تيك توك لجدول إعدادات الموقع
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS tiktok text;

-- تعليق توثيقي للعمود
COMMENT ON COLUMN site_settings.tiktok IS 'رابط حساب تيك توك من إعدادات الموقع';
