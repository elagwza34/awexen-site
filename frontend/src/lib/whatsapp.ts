export const WHATSAPP_PHONE = "201092400443";

export const WHATSAPP_MESSAGES = {
  ar: "مرحباً، أريد الاستفسار عن خدماتكم.",
  en: "Hello, I would like to inquire about your services.",
} as const;

/** wa.me expects the full international number without "+", spaces or leading zeros. */
export function whatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^00/, "");
  return /^[1-9]\d{6,14}$/.test(digits) ? digits : WHATSAPP_PHONE;
}

export function whatsappHref(phone: string = WHATSAPP_PHONE, message = "") {
  const digits = whatsappNumber(phone);
  const text = message.trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
