import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";

// عميل واحد مشترك لكل المسارات التي تحتاج React Query (لوحة التحكم والتعلّم والعروض).
// الملف ده بيتحمّل بشكل lazy من App فلا يدخل في تحميل الصفحات العامة.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function QueryOutlet() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
