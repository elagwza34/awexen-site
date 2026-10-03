import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildPreviewCss } from "../cms/style";
import type { ElementStyle } from "../cms/types";
import { useCmsEditing } from "./CmsContext";

/** Elements register here so the stylesheet knows what to emit. */
type Registry = { register: (scope: string, style: ElementStyle) => void };

const RegistryContext = createContext<Registry>({ register: () => {} });

/** Registers one element's style so its hover and mobile rules get emitted. */
export function useRegisterElementStyle(scope: string, style: ElementStyle | undefined) {
  const { register } = useContext(RegistryContext);
  // Serialising keeps the effect from re-running on every render, since the
  // style object identity changes even when the values did not.
  const json = JSON.stringify(style ?? null);
  useEffect(() => {
    register(scope, (JSON.parse(json) as ElementStyle | null) ?? {});
  }, [register, scope, json]);
}

/**
 * Mounts the CSS that inline styles cannot express: hover rules and mobile
 * overrides.
 *
 * Elements register themselves as they render, so the stylesheet follows the
 * draft without any element knowing about it. It only mounts while editing
 * mode is on, so the public site never receives a CMS stylesheet.
 *
 * Every rule is scoped to the element class, so two elements can never read
 * each other's hover colour or mobile size.
 */
export function CmsStyleSheet({ children }: { children: ReactNode }) {
  const editing = useCmsEditing();
  const [entries, setEntries] = useState<{ scope: string; style: ElementStyle }[]>([]);

  const register = useCallback<Registry["register"]>((scope, style) => {
    setEntries((current) => {
      const without = current.filter((entry) => entry.scope !== scope);
      // An empty style means the element was reset, so drop the entry.
      return Object.keys(style).length ? [...without, { scope, style }] : without;
    });
  }, []);

  const registry = useMemo(() => ({ register }), [register]);
  const css = useMemo(() => buildPreviewCss(entries), [entries]);

  return (
    <RegistryContext.Provider value={registry}>
      {editing && <style data-cms-styles="true" dangerouslySetInnerHTML={{ __html: css }} />}
      {children}
    </RegistryContext.Provider>
  );
}