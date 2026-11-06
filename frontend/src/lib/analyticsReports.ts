// Backend contract. No privileged reporting calls originate in the browser.
export type AnalyticsRange = { start: string; end: string };
export type OverviewMetrics = {
  totalUsers: number; sessions: number; pageViews: number; engagementRate: number;
  averageEngagementSeconds: number; whatsappClicks: number; contactSubmissions: number; initiativeApplications: number;
};
export type SourceReport = { source: string; medium: string; campaign: string; sessions: number; leads: number; conversionRate: number };
export type PageReport = { path: string; landingSessions: number; views: number; engagementRate: number; leads: number };
export type TrendPoint = { date: string; users: number; whatsapp: number; contacts: number; initiatives: number };
export type AnalyticsReport = {
  status: "connected"; range: AnalyticsRange; synchronizedAt: string;
  overview: OverviewMetrics; sources: SourceReport[]; pages: PageReport[]; trend: TrendPoint[];
};
export type ReportState =
  | { status: "disconnected"; reason: "missing_server_configuration" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | AnalyticsReport;

export function validAnalyticsRange(range: AnalyticsRange, now = new Date()) {
  const parse = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value).toISOString().slice(0, 10) === value;
  try {
    if (!parse(range.start) || !parse(range.end)) return false;
    const start = Date.parse(range.start), end = Date.parse(range.end);
    return start <= end && end - start <= 365 * 86400000 && range.end <= now.toISOString().slice(0, 10);
  } catch { return false; }
}

export async function loadAnalyticsReport(range: AnalyticsRange): Promise<ReportState> {
  if (!validAnalyticsRange(range)) return { status: "error", message: "invalid_date_range" };
  // No property ID / authorized server integration is configured. No invented metrics.
  return { status: "disconnected", reason: "missing_server_configuration" };
}
