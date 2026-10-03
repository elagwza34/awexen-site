import { useCallback, type ReactNode } from "react";
import { useCmsEditing } from "../../context/CmsContext";

/**
 * Wraps a real element on the site and makes it visually editable.
 *
 * The important part: outside the CMS preview it renders the children
 * exactly as they are — no extra span, no outline, no event listeners.
 * That is what keeps the public website completely untouched and makes
 * sure the selection overlay can never show up on the live site.
 */
export default function CmsEditable({
  elementId,
  children,
  as: Tag = "div",
}: {
  /** Stable identifier such as "hero.title". */
  elementId: string;
  children: ReactNode;
  /** Tag name, so the wrapper does not break the layout. */
  as?: "div" | "span";
}) {
  const editing = useCmsEditing();

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!editing) return;
      // Stop any link or button underneath from firing while selecting.
      event.preventDefault();
      event.stopPropagation();
      window.parent?.postMessage(
        { type: "awexen:cms-select", elementId },
        window.location.origin,
      );
    },
    [editing, elementId],
  );

  // Public site: children untouched, literally.
  if (!editing) return <>{children}</>;

  return (
    <Tag
      onClick={onClick}
      data-cms-element={elementId}
      className="relative cursor-pointer outline-dashed outline-2 outline-offset-4 outline-brand-400/50 transition hover:outline-solid hover:outline-brand-400"
      role="button"
      tabIndex={-1}
      aria-label={`Editable element: ${elementId}`}
    >
      {children}
    </Tag>
  );
}