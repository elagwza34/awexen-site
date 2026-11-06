import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackNavigation } from "../lib/analytics";

export default function AnalyticsRouteTracker() {
  const location = useLocation();
  const current = useRef(location);
  current.current = location;
  const identity = useRef({ path: "", id: "" });
  useEffect(() => {
    if (identity.current.path !== location.pathname || !identity.current.id) identity.current = { path: location.pathname, id: `${location.key}:${location.pathname}` };
    const run = () => { const value = current.current; trackNavigation(identity.current.id, value.pathname, value.search); };
    const frame = window.requestAnimationFrame(run);
    window.addEventListener("awexen-tracking-ready", run);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("awexen-tracking-ready", run); };
  }, [location.key, location.pathname, location.search]);
  return null;
}
