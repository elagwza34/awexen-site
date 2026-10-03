import { Link } from "react-router-dom";
import type { CSSProperties, ReactNode } from "react";
import { useCmsStyle } from "../context/CmsContext";
import { useLanguage } from "../context/LanguageContext";
import type { CmsButton } from "../cms/types";

/**
 * A button that reads its text, link and style from the CMS.
 *
 * It is the real component used on the public site and in the preview, so
 * what the admin edits is exactly what ships. With no CMS value it falls
 * back to the props it was given, keeping the original design intact.
 */
export default function CmsButton({
  section,
  element,
  button,
  children,
  className = "",
  variant = "link",
  style,
}: {
  section: string;
  element: string;
  /** Button record from the CMS, when one exists. */
  button?: CmsButton;
  /** Fallback content used when the CMS has no text for this button. */
  children?: ReactNode;
  className?: string;
  /** "link" renders a router link, "anchor" renders an <a>. */
  variant?: "link" | "anchor";
  style?: CSSProperties;
}) {
  const { lang } = useLanguage();
  const cmsStyle = useCmsStyle(section, element);

  const text = button?.text[lang === "ar" ? "ar" : "en"] ?? "";
  const label = text || children;
  const href = button?.link || "#";
  const newTab = button?.newTab ? { target: "_blank", rel: "noreferrer" } : {};
  // Hidden by the admin: hidden on the public site as well.
  if (cmsStyle.display === "none") return null;

  const merged = className;

  if (variant === "anchor" || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel")) {
    return (
      <a href={href} {...newTab} className={merged} style={{ ...cmsStyle, ...style }}>
        {label}
      </a>
    );
  }

  return (
    <Link to={href} {...newTab} className={merged} style={{ ...cmsStyle, ...style }}>
      {label}
    </Link>
  );
}