const labels: Array<[RegExp, string]> = [
  [/^Question (.+?) option (.+)$/, "السؤال $1 · الخيار $2"],
  [/^Question (.+)$/, "السؤال $1"],
  [/^Section (.+)$/, "المرحلة $1"],
  [/^Project (.+)$/, "نوع المشروع $1"],
  [/^Rule (.+)$/, "القاعدة $1"],
  [/^Template (.+)$/, "القالب $1"],
  [/^Templates$/, "القوالب"],
  [/^Settings$/, "الإعدادات"],
  [/^projectId$/, "نوع المشروع"],
  [/^answers$/, "الإجابات"],
];

const messages: Record<string, string> = {
  "invalid pricing method": "طريقة تسعير غير صالحة",
  "price is unconfigured": "السعر غير مُعد",
  "invalid billing period": "دورة فوترة غير صالحة",
  "invalid subtotal": "مجموع فرعي غير صالح",
  "invalid maximum charge": "حد أقصى للقيمة غير صالح",
  "invalid charge key": "مفتاح قيمة غير صالح",
  "invalid included quantity": "كمية مشمولة غير صالحة",
  "missing included quantity": "الكمية المشمولة مفقودة",
  "missing or invalid amount": "المبلغ مفقود أو غير صالح",
  "missing or invalid unit price": "سعر الوحدة مفقود أو غير صالح",
  "missing or invalid rate and subtotal": "النسبة أو المجموع الفرعي مفقود أو غير صالح",
  "multiplier must use its subtotal billing period": "يجب أن يستخدم المضاعف دورة فوترة المجموع الفرعي",
  "missing pricing tiers": "شرائح التسعير مفقودة",
  "invalid pricing tier": "شريحة تسعير غير صالحة",
  "overlapping pricing tiers": "شرائح تسعير متداخلة",
  "pricing tiers leave a quantity gap": "توجد فجوة كميات بين شرائح التسعير",
  "pricing tiers do not cover the full quantity range": "شرائح التسعير لا تغطي كامل نطاق الكميات",
  "invalid or overly nested condition": "شرط غير صالح أو متداخل بعمق زائد",
  "invalid condition group": "مجموعة شروط غير صالحة",
  "invalid condition reference or operator": "مرجع أو معامل شرط غير صالح",
  "invalid condition operand": "قيمة شرط غير صالحة",
  "invalid currency": "عملة غير صالحة",
  "invalid rounding": "إعداد التقريب غير صالح",
  "invalid breakdown visibility": "إعداد إظهار التفصيل غير صالح",
  "missing terms translation": "ترجمة الشروط مفقودة",
  "invalid lead fields": "حقول بيانات العميل غير صالحة",
  "invalid or duplicate ID": "معرّف غير صالح أو مكرر",
  "missing title translation": "ترجمة العنوان مفقودة",
  "invalid active status": "حالة التفعيل غير صالحة",
  "invalid order": "ترتيب غير صالح",
  "invalid list": "قائمة غير صالحة",
  "invalid question kind": "نوع سؤال غير صالح",
  "missing description translation": "ترجمة الوصف مفقودة",
  "invalid project references": "مراجع أنواع المشاريع غير صالحة",
  "an archived project must be inactive": "نوع المشروع المؤرشف يجب أن يكون غير مفعّل",
  "unknown section": "مرحلة غير معروفة",
  "invalid internal notes": "ملاحظات داخلية غير صالحة",
  "invalid required status": "حالة الإلزام غير صالحة",
  "invalid quantity range or step": "نطاق أو خطوة الكمية غير صالح",
  "information blocks cannot charge": "بلوكات المعلومات لا يمكن أن تحمل سعرًا",
  "information blocks cannot have a default": "بلوكات المعلومات لا يمكن أن يكون لها إجابة افتراضية",
  "invalid options": "خيارات غير صالحة",
  "only selection questions support options": "الخيارات متاحة فقط لأسئلة الاختيار",
  "invalid default": "قيمة افتراضية غير صالحة",
  "conflicting option defaults": "تعارض في الخيارات الافتراضية",
  "missing or invalid item fields": "حقول العناصر مفقودة أو غير صالحة",
  "invalid item field": "حقل عنصر غير صالح",
  "invalid item field range": "نطاق حقل العنصر غير صالح",
  "invalid stage": "مرحلة القاعدة غير صالحة",
  "invalid discount method or rate": "طريقة أو نسبة الخصم غير صالحة",
  "unknown quantity question": "سؤال كمية غير معروف",
  "invalid cap target": "هدف الحد الأقصى غير صالح",
  "conflicting conditions": "شروط متعارضة",
  "conditions can only use answers from an earlier step": "الشروط يمكنها استخدام إجابات من خطوة سابقة فقط",
  "conditions can only use answers from the same or an earlier step": "الشروط يمكنها استخدام إجابات من نفس الخطوة أو خطوة سابقة فقط",
  "invalid default answer": "إجابة افتراضية غير صالحة",
  "No active projects": "لا توجد أنواع مشاريع مفعّلة",
  "Unknown or inactive project type": "نوع مشروع غير معروف أو غير مفعّل",
  "Expected an answer object": "صيغة الإجابات غير صالحة",
};

const keys: Record<string, string> = {
  title: "العنوان",
  description: "الوصف",
  delivery: "مدة التسليم",
  included: "الخدمات المشمولة",
  exclusions: "الاستثناءات",
  terms: "الشروط",
  basePrice: "السعر الأساسي",
  minimumPrice: "الحد الأدنى للسعر",
  minorUnits: "الخانات العشرية",
  validityDays: "مدة الصلاحية",
  monthsPerYear: "أشهر السنة الأولى",
  taxBps: "الضريبة",
  discountLimitBps: "حد الخصم",
};

function translateMessage(message: string) {
  if (messages[message]) return messages[message];
  let match = /^missing (.+) translation$/.exec(message);
  if (match) return `ترجمة ${keys[match[1]] ?? match[1]} مفقودة`;
  match = /^invalid (.+)$/.exec(message);
  if (match) return `قيمة غير صالحة في ${keys[match[1]] ?? match[1]}`;
  match = /^unreachable required question for project (.+)$/.exec(message);
  if (match) return `سؤال إلزامي غير قابل للوصول لنوع المشروع ${match[1]}`;
  match = /^Circular option dependency at (.+)$/.exec(message);
  if (match) return `اعتماد دائري بين الخيارات عند ${match[1]}`;
  match = /^Circular dependency at (.+)$/.exec(message);
  if (match) return `اعتماد دائري عند ${match[1]}`;
  match = /^option (.+)$/.exec(message);
  if (match) return `الخيار ${match[1]}`;
  return message;
}

export function translateIssue(issue: string) {
  const split = /^(.+?): (.*)$/.exec(issue);
  if (!split) return translateMessage(issue);
  const [, label, message] = split;
  const translated = labels.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), label);
  return `${translated}: ${translateMessage(message)}`;
}

const apiMessages: Record<string, string> = {
  "Sign in to continue.": "سجّل الدخول للمتابعة.",
  "Only AWEXEN owners and administrators can manage the calculator.": "إدارة الحاسبة متاحة فقط لمالكي AWEXEN والمسؤولين.",
  "The initial calculator draft has not been installed.": "لم يتم تثبيت المسودة الأولية للحاسبة.",
  "Invalid records page.": "صفحة سجلات غير صالحة.",
  "Invalid lead status.": "حالة طلب غير صالحة.",
  "Lead was not found.": "لم يتم العثور على الطلب.",
  "Unknown calculator action.": "إجراء حاسبة غير معروف.",
  "Expected an object.": "صيغة الطلب غير صحيحة.",
  "Invalid request identifier.": "معرّف طلب غير صالح.",
  "Invalid request.": "طلب غير صالح.",
  "Draft is missing its settings, projects, sections, questions, or rules.": "المسودة تنقصها الإعدادات أو أنواع المشاريع أو المراحل أو الأسئلة أو القواعد.",
  "The draft changed. Reload it before publishing.": "تغيّرت المسودة. أعد تحميلها قبل النشر.",
  "The draft changed. Reload it before retrying.": "تغيّرت المسودة. أعد تحميلها قبل المحاولة مجددًا.",
  "Fix the configuration before publishing.": "صحّح الإعدادات قبل النشر.",
  "Prices changed. Review the updated estimate.": "تغيّرت الأسعار. راجع التقدير المحدث.",
  "Already used for a different request.": "هذا المعرّف مستخدم لطلب آخر.",
  "A formal quotation was already requested.": "تم طلب عرض سعر رسمي بالفعل.",
  "This estimate has expired.": "انتهت صلاحية هذا التقدير.",
  "The requested record was not found.": "لم يتم العثور على السجل المطلوب.",
  "The request already exists.": "الطلب موجود بالفعل.",
  "Unable to complete the calculator request.": "تعذر إكمال طلب الحاسبة.",
  "Request is missing or exceeds the permitted size.": "الطلب مفقود أو يتجاوز الحجم المسموح.",
  "Request exceeds the permitted size.": "الطلب يتجاوز الحجم المسموح.",
  "Request must be valid UTF-8 JSON.": "يجب أن يكون الطلب بصيغة JSON صالحة.",
  "A text field exceeds its permitted size or has an invalid type.": "أحد الحقول النصية يتجاوز الحجم المسموح أو نوعه غير صالح.",
  "Invalid configuration identifier.": "معرّف إعداد غير صالح.",
  "Too many requests. Try again in a minute.": "طلبات كثيرة. حاول مرة أخرى بعد دقيقة.",
};

export function translateApiError(message: string) {
  return message.split("\n").map((line) => apiMessages[line] ?? translateIssue(line)).join("\n");
}
