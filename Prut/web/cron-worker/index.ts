interface Env {
  CRON_SECRET: string;
  APP_URL: string;
}

const CRON_ROUTES: Record<string, string> = {
  "0 9 * * *": "/api/cron/send-emails",
  "0 10 * * *": "/api/cron/reengagement",
  "0 6 * * *": "/api/cron/sync-subscriptions",
  "0 3 1 * *": "/api/cron/data-retention",
};

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const path = CRON_ROUTES[event.cron];
    if (!path) {
      console.error(`Unknown cron expression: ${event.cron}`);
      return;
    }
    const response = await fetch(`${env.APP_URL}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
    });
    if (!response.ok) {
      console.error(`Cron ${path} failed: ${response.status}`);
    } else {
      console.log(`Cron ${path} OK: ${response.status}`);
    }
  },
};
