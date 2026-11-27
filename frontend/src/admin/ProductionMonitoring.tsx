import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

type EventRow = {
  hour: string;
  kind: string;
  route: string;
  build: string;
  browser: string;
  os: string;
  rating: string;
  occurrences: number;
  first_seen: string;
  last_seen: string;
};

const timestamp = new Intl.DateTimeFormat("en-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" });
const severity = (row: EventRow) => {
  if (row.rating === "poor" || ["runtime", "unhandled-rejection", "chunk", "edge"].includes(row.kind)) return "Error";
  if (row.rating === "needs-improvement" || ["resource", "api", "service-worker", "compatibility"].includes(row.kind)) return "Warning";
  return "Info";
};

export default function ProductionMonitoring() {
  const diagnostics = useQuery({
    queryKey: ["private-production-diagnostics"],
    queryFn: async () => {
      if (!supabase) throw new Error("Diagnostics unavailable");
      const result = await supabase.functions.invoke<{ events: EventRow[] }>("client-events", { method: "GET" });
      if (result.error || !Array.isArray(result.data?.events)) throw new Error("Diagnostics unavailable");
      return result.data.events;
    },
    retry: false,
    gcTime: 0,
  });
  return (
    <section dir="ltr" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Production monitoring</h2>
        <button type="button" className="admin-button-secondary" disabled={diagnostics.isFetching}
          onClick={() => void diagnostics.refetch()}>Refresh</button>
      </header>
      {diagnostics.isPending && <p role="status">Loading diagnostic events…</p>}
      {diagnostics.isError && <p role="alert">Unable to load production diagnostics.</p>}
      {diagnostics.data?.length === 0 && <p>No diagnostic events recorded.</p>}
      {Boolean(diagnostics.data?.length) && (
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <caption className="sr-only">Latest hourly diagnostic aggregates</caption>
            <thead>
              <tr>{["Severity", "Event", "Route", "Build", "Browser", "Rating", "Count", "First seen", "Last seen"].map((name) =>
                <th key={name} scope="col" className="p-2 text-start">{name}</th>)}</tr>
            </thead>
            <tbody>
              {diagnostics.data?.map((row) => (
                <tr key={[row.hour, row.kind, row.route, row.build, row.browser, row.os, row.rating].join(":")} className="border-t border-current/15">
                  <td className="p-2">{severity(row)}</td><td className="p-2">{row.kind}</td>
                  <td className="p-2">{row.route}</td><td className="p-2">{row.build}</td>
                  <td className="p-2">{row.browser} / {row.os}</td><td className="p-2">{row.rating === "event" ? "—" : row.rating}</td>
                  <td className="p-2">{row.occurrences}</td>
                  <td className="p-2">{timestamp.format(new Date(row.first_seen))}</td>
                  <td className="p-2">{timestamp.format(new Date(row.last_seen))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
