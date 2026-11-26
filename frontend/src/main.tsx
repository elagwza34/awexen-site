import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppErrorBoundary } from "./components/ui";
import { setupAnalytics } from "./lib/analytics";
import { startAppUpdateWatcher, setupStaleAssetRecovery } from "./lib/appUpdate";
import { isBrowserSupported } from "./lib/compat";
import { recordDiagnostic, setupMonitoring } from "./lib/telemetry";

setupAnalytics();
setupMonitoring();
setupStaleAssetRecovery();

const rootElement = document.getElementById("root")!;

if (!isBrowserSupported()) {
  // شاشة التوافق مرسومة من السكربت المضمّن في index.html؛ ما نركّبش React فوقها.
  recordDiagnostic("compatibility", "browser lacks required CSS features");
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>
  );
  startAppUpdateWatcher();
}
