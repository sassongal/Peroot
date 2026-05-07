/**
 * Idempotent PostHog dashboard provisioning for Peroot.
 *
 * Reads `posthog="phx_..."` from .env.local and upserts four dashboards
 * (Memory Palace, Activation, Conversion, Retention) plus their insights.
 * Re-running is safe: existing dashboards/insights are matched by exact name.
 *
 * Run: `npm run posthog:setup`
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

const PERSONAL_KEY = process.env.posthog ?? process.env.POSTHOG_PERSONAL_API_KEY;
const HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(
  "us.i.posthog.com",
  "us.posthog.com",
);

if (!PERSONAL_KEY || !PERSONAL_KEY.startsWith("phx_")) {
  console.error(
    'Missing PostHog personal API key. Expected `posthog="phx_..."` in .env.local ' +
      "or POSTHOG_PERSONAL_API_KEY env var.",
  );
  process.exit(1);
}

type Json = Record<string, unknown>;

async function ph<T = Json>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: Json,
): Promise<T> {
  const res = await fetch(`${HOST}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PERSONAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return (await res.json()) as T;
}

async function getProjectId(): Promise<number> {
  const data = await ph<{ results: Array<{ id: number; name: string }> }>("GET", "/api/projects/");
  const project = data.results[0];
  if (!project) throw new Error("No PostHog projects accessible with this key");
  console.log(`→ Project: ${project.name} (id=${project.id})`);
  return project.id;
}

async function findOrCreateDashboard(
  projectId: number,
  name: string,
  description: string,
): Promise<number> {
  const list = await ph<{ results: Array<{ id: number; name: string }> }>(
    "GET",
    `/api/projects/${projectId}/dashboards/?limit=200`,
  );
  const existing = list.results.find((d) => d.name === name);
  if (existing) {
    console.log(`  ✓ dashboard "${name}" exists (id=${existing.id})`);
    return existing.id;
  }
  const created = await ph<{ id: number }>("POST", `/api/projects/${projectId}/dashboards/`, {
    name,
    description,
    pinned: true,
  });
  console.log(`  + dashboard "${name}" created (id=${created.id})`);
  return created.id;
}

async function findOrCreateInsight(
  projectId: number,
  dashboardId: number,
  name: string,
  query: Json,
): Promise<void> {
  const list = await ph<{ results: Array<{ id: number; name: string; dashboards: number[] }> }>(
    "GET",
    `/api/projects/${projectId}/insights/?limit=500`,
  );
  const existing = list.results.find((i) => i.name === name);
  if (existing) {
    if (!existing.dashboards.includes(dashboardId)) {
      await ph("PATCH", `/api/projects/${projectId}/insights/${existing.id}/`, {
        dashboards: [...existing.dashboards, dashboardId],
      });
      console.log(`    ↻ "${name}" attached to dashboard`);
    } else {
      console.log(`    ✓ "${name}" already on dashboard`);
    }
    return;
  }
  await ph("POST", `/api/projects/${projectId}/insights/`, {
    name,
    query,
    dashboards: [dashboardId],
  });
  console.log(`    + "${name}" created`);
}

// ─── Insight query builders (HogQL `query` shape) ────────────────────────────

function trends(events: string[], opts: { interval?: string; display?: string } = {}): Json {
  return {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: events.map((e) => ({ kind: "EventsNode", event: e, name: e, math: "total" })),
      interval: opts.interval ?? "day",
      trendsFilter: { display: opts.display ?? "ActionsLineGraph" },
      dateRange: { date_from: "-30d" },
    },
  };
}

function funnel(steps: string[]): Json {
  return {
    kind: "InsightVizNode",
    source: {
      kind: "FunnelsQuery",
      series: steps.map((e) => ({ kind: "EventsNode", event: e, name: e })),
      funnelsFilter: { funnelVizType: "steps" },
      dateRange: { date_from: "-30d" },
    },
  };
}

function retention(targetEvent: string): Json {
  return {
    kind: "InsightVizNode",
    source: {
      kind: "RetentionQuery",
      retentionFilter: {
        period: "Week",
        totalIntervals: 8,
        targetEntity: { id: targetEvent, name: targetEvent, type: "events" },
        returningEntity: { id: targetEvent, name: targetEvent, type: "events" },
        retentionType: "retention_first_time",
      },
      dateRange: { date_from: "-56d" },
    },
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`PostHog → ${HOST}`);
  const projectId = await getProjectId();

  // 1. Memory Palace
  console.log("\nMemory Palace dashboard");
  const mpId = await findOrCreateDashboard(
    projectId,
    "Memory Palace",
    "Sidebar/drawer engagement, neighbor navigation, hop depth.",
  );
  await findOrCreateInsight(projectId, mpId, "Palace opens (sidebar+drawer)", {
    kind: "InsightVizNode",
    source: {
      kind: "TrendsQuery",
      series: [
        { kind: "EventsNode", event: "palace_sidebar_opened", name: "sidebar" },
        { kind: "EventsNode", event: "palace_drawer_opened", name: "drawer" },
      ],
      interval: "day",
      trendsFilter: { display: "ActionsLineGraph" },
      dateRange: { date_from: "-30d" },
    },
  });
  await findOrCreateInsight(
    projectId,
    mpId,
    "Neighbor click → navigation rate",
    funnel(["palace_node_clicked", "palace_navigated_to_prompt"]),
  );
  await findOrCreateInsight(
    projectId,
    mpId,
    "Empty state reasons",
    trends(["palace_empty_state_shown"], { display: "ActionsBarValue" }),
  );

  // 2. Activation
  console.log("\nActivation dashboard");
  const actId = await findOrCreateDashboard(
    projectId,
    "Activation",
    "Signup → first improve → save → reuse.",
  );
  await findOrCreateInsight(
    projectId,
    actId,
    "Activation funnel",
    funnel(["user_signup", "prompt_enhance", "library_prompt_use"]),
  );
  await findOrCreateInsight(
    projectId,
    actId,
    "Daily prompt enhancements",
    trends(["prompt_enhance"]),
  );
  await findOrCreateInsight(
    projectId,
    actId,
    "Daily library reuses",
    trends(["library_prompt_use"]),
  );

  // 3. Conversion
  console.log("\nConversion dashboard");
  const convId = await findOrCreateDashboard(
    projectId,
    "Conversion (Free → Pro)",
    "Paywall hits, checkout, subscriptions.",
  );
  await findOrCreateInsight(
    projectId,
    convId,
    "Free → Pro funnel",
    funnel(["paywall_hit", "checkout_opened", "subscription_started"]),
  );
  await findOrCreateInsight(
    projectId,
    convId,
    "New Pro subscriptions / day",
    trends(["subscription_started"]),
  );

  // 4. Retention
  console.log("\nRetention dashboard");
  const retId = await findOrCreateDashboard(
    projectId,
    "Retention",
    "Weekly retention on prompt_enhance — 8-week cohort.",
  );
  await findOrCreateInsight(projectId, retId, "Weekly retention (8w)", retention("prompt_enhance"));

  console.log("\n✓ Done. Open https://us.posthog.com/dashboard");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
