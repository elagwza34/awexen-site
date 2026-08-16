-- ============================================================
--  awexen — بناء قاعدة البيانات
-- ============================================================
--  طريقة الاستخدام:
--   1) أنشئ قاعدة بيانات جديدة من cPanel > MySQL Databases
--   2) افتح phpMyAdmin > اختر القاعدة > تبويب Import
--   3) ارفع هذا الملف واضغط Go
--
--  ملاحظة: أعمدة JSON مخزنة كـ LONGTEXT لضمان التوافق
--  مع كل إصدارات MySQL / MariaDB على الاستضافات المشتركة.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- إعدادات الموقع (صف واحد)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120)  NOT NULL DEFAULT 'awexen.com',
  `brandAr`     VARCHAR(120)  NOT NULL DEFAULT 'أوكسين',
  `tagline`     VARCHAR(255)  NOT NULL DEFAULT '',
  `description` TEXT          NULL,
  `address`     VARCHAR(255)  NULL,
  `email`       VARCHAR(160)  NULL,
  `phones`      VARCHAR(160)  NULL,
  `hours`       VARCHAR(255)  NULL,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- الخدمات
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`           VARCHAR(80)  NOT NULL,
  `title`          VARCHAR(180) NOT NULL,
  `short`          TEXT         NULL,
  `icon`           VARCHAR(40)  NOT NULL DEFAULT 'code',
  `color`          VARCHAR(120) NOT NULL DEFAULT 'from-brand-500 to-red-600',
  `tagline`        VARCHAR(140) NULL,
  `hero_desc`      TEXT         NULL,
  `overview_title` VARCHAR(220) NULL,
  `overview`       LONGTEXT     NULL COMMENT 'JSON: ["فقرة", "فقرة"]',
  `stats`          LONGTEXT     NULL COMMENT 'JSON: [{"value":"","label":""}]',
  `features`       LONGTEXT     NULL COMMENT 'JSON: [{"icon":"","title":"","desc":""}]',
  `steps`          LONGTEXT     NULL COMMENT 'JSON: [{"title":"","desc":""}]',
  `deliverables`   LONGTEXT     NULL COMMENT 'JSON: ["مخرج"]',
  `tools`          LONGTEXT     NULL COMMENT 'JSON: ["أداة"]',
  `packages`       LONGTEXT     NULL COMMENT 'JSON: [{"name":"","price":"","currency":"","desc":"","features":[],"featured":false}]',
  `faqs`           LONGTEXT     NULL COMMENT 'JSON: [{"q":"","a":""}]',
  `sort_order`     INT          NOT NULL DEFAULT 0,
  `is_active`      TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_slug` (`slug`),
  KEY `idx_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- معرض الأعمال
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`      VARCHAR(180) NOT NULL,
  `desc`       VARCHAR(400) NULL,
  `tag`        VARCHAR(80)  NULL,
  `image`      VARCHAR(500) NULL,
  `site`       VARCHAR(500) NULL,
  `accent`     VARCHAR(160) NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_active_order` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- الباقات العامة (صفحة الأسعار بالرئيسية)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `plans` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(120) NOT NULL,
  `desc`       VARCHAR(400) NULL,
  `currency`   VARCHAR(40)  NOT NULL DEFAULT 'جنية',
  `price`      VARCHAR(40)  NOT NULL DEFAULT '0',
  `cta`        VARCHAR(80)  NOT NULL DEFAULT 'ابدأ الآن',
  `features`   LONGTEXT     NULL COMMENT 'JSON: ["ميزة"]',
  `featured`   TINYINT(1)   NOT NULL DEFAULT 0,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- آراء العملاء
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `testimonials` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quote`      TEXT         NOT NULL,
  `name`       VARCHAR(140) NOT NULL,
  `role`       VARCHAR(180) NULL,
  `avatar`     VARCHAR(500) NULL,
  `rating`     TINYINT      NOT NULL DEFAULT 5,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- الإحصائيات
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stats` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `value`      VARCHAR(40)  NOT NULL,
  `label`      VARCHAR(120) NOT NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- العلامات التجارية
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `brands` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(140) NOT NULL,
  `logo`       VARCHAR(500) NULL,
  `sort_order` INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- طلبات التواصل
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(140) NOT NULL,
  `phone`      VARCHAR(40)  NOT NULL,
  `email`      VARCHAR(180) NULL,
  `service`    VARCHAR(120) NULL,
  `budget`     VARCHAR(120) NULL,
  `message`    TEXT         NULL,
  `status`     ENUM('new','contacted','won','lost') NOT NULL DEFAULT 'new',
  `ip`         VARCHAR(64)  NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status_date` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  بيانات مبدئية (يمكن استبدالها لاحقاً عبر seed.php)
-- ============================================================

INSERT INTO `settings` (`id`, `name`, `brandAr`, `tagline`, `description`, `address`, `email`, `phones`, `hours`)
VALUES (
  1,
  'awexen.com',
  'أوكسين',
  'منصة تصميم مواقع ووردبريس',
  'نحن نُنشئ مواقع ويب عصرية واحترافية تساعد الشركات على النمو عبر الإنترنت. من التصميم إلى التطوير، نحرص على تقديم أعلى مستويات الجودة والتميّز.',
  'مصر - طنطا - شارع طة الحكيم',
  'info@awexen.com',
  '01092400443 - 01202920009',
  'الأحد : الخميس: 9:00 صباحًا – 6:00 مساءً'
)
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `stats` (`value`, `label`, `sort_order`) VALUES
  ('250+', 'مشروع منجز',   1),
  ('98%',  'رضا العملاء',  2),
  ('62+',  'شهادة عملائنا', 3),
  ('48+',  'عضو في الفريق', 4);

INSERT INTO `brands` (`name`, `sort_order`) VALUES
  ('أبجد', 1), ('هوز', 2), ('حطي', 3), ('كلمن', 4),
  ('سعفص', 5), ('قرشت', 6), ('ثخذ', 7), ('ضظغ', 8);
