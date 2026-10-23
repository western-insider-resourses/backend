
const RANGES: Record<string, string> = {
  "7d": "LAST_7_DAYS",
  "30d": "LAST_30_DAYS",
  month: "MONTH_TO_DATE",
};

export const adsenseConfigured = (): boolean =>
  !!(
    process.env.ADSENSE_ACCOUNT_ID &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );

async function accessToken(): Promise<string> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN ?? "",
      grant_type: "refresh_token",
    }),
  });
  const data = (await r.json()) as {
    access_token: string;
    error_description?: string;
  };
  if (!r.ok)
    throw new Error(
      data.error_description || "Google rejected the AdSense credentials.",
    );
  return data.access_token;
}

interface Cell {
  value?: string;
}
interface ReportResponse {
  headers?: Array<{ type: string; currencyCode?: string }>;
  rows?: Array<{ cells: Cell[] }>;
  totals?: { cells: Cell[] };
  error?: { message?: string };
}

export interface AdsenseReport {
  configured: boolean;
  currency?: string;
  totals?: {
    earnings: number;
    pageViews: number;
    impressions: number;
    clicks: number;
  };
  days?: Array<{
    date: string;
    earnings: number;
    pageViews: number;
    impressions: number;
    clicks: number;
  }>;
}

export async function adsenseReport(range = "30d"): Promise<AdsenseReport> {
  if (!adsenseConfigured()) return { configured: false };
  const token = await accessToken();
  const params = new URLSearchParams({
    dateRange: RANGES[range] || RANGES["30d"],
    reportingTimeZone: "ACCOUNT_TIME_ZONE",
  });
  for (const m of ["ESTIMATED_EARNINGS", "PAGE_VIEWS", "IMPRESSIONS", "CLICKS"])
    params.append("metrics", m);
  params.append("dimensions", "DATE");
  params.append("orderBy", "+DATE");
  const id = (process.env.ADSENSE_ACCOUNT_ID ?? "").replace(/^accounts\//, "");
  const r = await fetch(
    `https://adsense.googleapis.com/v2/accounts/${id}/reports:generate?${params}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const data = (await r.json()) as ReportResponse;
  if (!r.ok) throw new Error(data.error?.message || "AdSense request failed.");

  const num = (c?: Cell): number => Number(c?.value || 0);
  const days = (data.rows || []).map((row) => ({
    date: row.cells[0]?.value ?? "",
    earnings: num(row.cells[1]),
    pageViews: num(row.cells[2]),
    impressions: num(row.cells[3]),
    clicks: num(row.cells[4]),
  }));
  const t = data.totals?.cells || [];
  return {
    configured: true,
    currency:
      data.headers?.find((h) => h.type === "METRIC_CURRENCY")?.currencyCode ||
      "USD",
    totals: {
      earnings: num(t[1]),
      pageViews: num(t[2]),
      impressions: num(t[3]),
      clicks: num(t[4]),
    },
    days,
  };
}
