import { useLayoutEffect } from "react";

export function useStaticDocumentHandoff() {
  useLayoutEffect(() => {
    document.getElementById("awexen-static-document")?.remove();
  }, []);
}
