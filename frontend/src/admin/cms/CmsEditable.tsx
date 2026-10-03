import { useCallback, cloneElement, isValidElement, type CSSProperties, type ReactNode } from "react";
import { useCmsEditing, useCmsSelection, useCmsStyle } from "../../context/CmsContext";

/**
 * Makes a real element on the site visually editable.
 *
 * Outside the CMS preview it returns the child untouched, so the public site
 * gets exactly the original DOM and nothing else. Inside the preview the
 * child element itself carries the data attributes and the click handler,
 * so there is no extra wrapper to disturb the section layout.
 */
export default function CmsEditable({
  section,
  element,
  children,
  style,
}: {
  /** Section key, e.g. "hero". */
  section: string;
  /** Element key inside the section, e.g. "title". Together: hero.title. */
  element: string;
  children: ReactNode;
  /** Extra inline styles merged after the CMS style. */
  style?: CSSProperties;
}) {
  const editing = useCmsEditing();
  const selected = useCmsSelection();
  const cmsStyle = useCmsStyle(section, element);
  const elementId = `${section}.${element}`;

  const onClick = useCallback(
    (event: React.MouseEvent) => {
      if (!editing) return;
      // Stop the link or button underneath from navigating while selecting.
      event.preventDefault();
      event.stopPropagation();
      window.parent?.postMessage({ type: "awexen:cms-select", elementId }, window.location.origin);
    },
    [editing, elementId],
  );

  // Public site: the child is returned exactly as it was written.
  if (!editing) return <>{children}</>;

  const merged = { ...cmsStyle, ...style } as CSSProperties;

  // A single element child: annotate it directly, no wrapper.
  if (isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>;
    return cloneElement(child, {
      ...merged,
      "data-cms-element": elementId,
      "data-cms-selected": selected === elementId ? "true" : undefined,
      onClick,
      role: child.props.role ?? "button",
      "aria-label": child.props["aria-label"] ?? `Editable element: ${elementId}`,
    } as Partial<unknown> & React.Attributes);
  }

  // Text-only child: wrap it so the attributes have something to live on.
  // The CMS style carries custom properties, which need a cast to satisfy
  // the DOM attribute types.
  const spanProps = {
    ...merged,
    "data-cms-element": elementId,
    "data-cms-selected": selected === elementId ? "true" : undefined,
    onClick,
    role: "button",
    tabIndex: -1,
    "aria-label": `Editable element: ${elementId}`,
  } as unknown as React.HTMLAttributes<HTMLSpanElement>;

  return <span {...spanProps}>{children}</span>;
}