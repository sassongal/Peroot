import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

function getAnalyticsClient(): BetaAnalyticsDataClient | null {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) return null;
  try {
    const credentials = JSON.parse(credentialsJson);
    return new BetaAnalyticsDataClient({ credentials });
  } catch {
    logger.error('[GA4] Failed to parse credentials JSON');
    return null;
  }
}

const GA_PROPERTY_ID = process.env.GA4_PROPERTY_ID;

// Helper to safely parse GA4 metric values
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metricInt(row: any, idx: number): number {
  return parseInt(row?.metricValues?.[idx]?.value || '0', 10);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metricFloat(row: any, idx: number): number {
  return parseFloat(row?.metricValues?.[idx]?.value || '0');
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dimStr(row: any, idx: number): string {
  return row?.dimensionValues?.[idx]?.value || '';
}

export async function GET(request: NextRequest) {
  try {
    const { error, user } = await validateAdminSession();
    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Forbidden' },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    if (!GA_PROPERTY_ID) {
      return NextResponse.json({ error: 'GA4_PROPERTY_ID not configured' }, { status: 500 });
    }

    const client = getAnalyticsClient();
    if (!client) {
      return NextResponse.json({ error: 'Google Analytics credentials not configured' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '28';
    const days = Math.min(parseInt(range, 10) || 28, 365);

    const startDate = `${days}daysAgo`;
    const endDate = 'today';
    const propertyId = `properties/${GA_PROPERTY_ID}`;

    // Previous period for comparison
    const prevStartDate = `${days * 2}daysAgo`;
    const prevEndDate = `${days + 1}daysAgo`;

    const [
      overviewRes, prevOverviewRes, dailyRes, pagesRes, sourcesRes,
      devicesRes, countriesRes, sourceMediumRes, landingPagesRes,
      eventsRes, hourlyRes, browserRes
    ] = await Promise.all([
      // 1. Overview metrics (current period)
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' },
          { name: 'engagedSessions' },
          { name: 'userEngagementDuration' },
          { name: 'sessionsPerUser' },
          { name: 'screenPageViewsPerSession' },
        ],
      }),

      // 2. Overview metrics (previous period for comparison)
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
          { name: 'newUsers' },
        ],
      }),

      // 3. Daily breakdown
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'engagedSessions' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date', orderType: 'ALPHANUMERIC' } }],
      }),

      // 4. Top pages
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      }),

      // 5. Traffic channels
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),

      // 6. Devices
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      }),

      // 7. Countries
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }),

      // 8. Source / Medium detail
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }),

      // 9. Landing pages
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'landingPage' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 15,
      }),

      // 10. Events
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [
          { name: 'eventCount' },
          { name: 'totalUsers' },
        ],
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20,
      }),

      // 11. Hourly breakdown (last 7 days for pattern detection)
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'hour' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
        ],
        orderBys: [{ dimension: { dimensionName: 'hour', orderType: 'ALPHANUMERIC' } }],
      }),

      // 12. Browsers
      client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'browser' }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
        ],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 8,
      }),
    ]);

    // Parse overview
    const ov = overviewRes[0]?.rows?.[0];
    const prevOv = prevOverviewRes[0]?.rows?.[0];
    const overview = {
      activeUsers: metricInt(ov, 0),
      sessions: metricInt(ov, 1),
      pageViews: metricInt(ov, 2),
      bounceRate: metricFloat(ov, 3),
      avgSessionDuration: metricFloat(ov, 4),
      newUsers: metricInt(ov, 5),
      engagedSessions: metricInt(ov, 6),
      totalEngagementDuration: metricFloat(ov, 7),
      sessionsPerUser: metricFloat(ov, 8),
      pagesPerSession: metricFloat(ov, 9),
      engagementRate: metricInt(ov, 6) / Math.max(metricInt(ov, 1), 1),
    };

    // Previous period for delta %
    const prev = {
      activeUsers: metricInt(prevOv, 0),
      sessions: metricInt(prevOv, 1),
      pageViews: metricInt(prevOv, 2),
      bounceRate: metricFloat(prevOv, 3),
      avgSessionDuration: metricFloat(prevOv, 4),
      newUsers: metricInt(prevOv, 5),
    };

    function pctChange(current: number, previous: number): number | null {
      if (previous === 0) return current > 0 ? 100 : null;
      return Math.round(((current - previous) / previous) * 100);
    }

    const deltas = {
      activeUsers: pctChange(overview.activeUsers, prev.activeUsers),
      sessions: pctChange(overview.sessions, prev.sessions),
      pageViews: pctChange(overview.pageViews, prev.pageViews),
      bounceRate: pctChange(overview.bounceRate, prev.bounceRate),
      avgSessionDuration: pctChange(overview.avgSessionDuration, prev.avgSessionDuration),
      newUsers: pctChange(overview.newUsers, prev.newUsers),
    };

    // Parse daily data
    const daily = (dailyRes[0]?.rows || []).map((row) => ({
      date: dimStr(row, 0),
      activeUsers: metricInt(row, 0),
      sessions: metricInt(row, 1),
      pageViews: metricInt(row, 2),
      engagedSessions: metricInt(row, 3),
    }));

    // Parse top pages (with bounce rate)
    const topPages = (pagesRes[0]?.rows || []).map((row) => ({
      path: dimStr(row, 0),
      pageViews: metricInt(row, 0),
      users: metricInt(row, 1),
      avgDuration: metricFloat(row, 2),
      bounceRate: metricFloat(row, 3),
    }));

    // Parse traffic sources (with avg duration)
    const trafficSources = (sourcesRes[0]?.rows || []).map((row) => ({
      channel: dimStr(row, 0),
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
      bounceRate: metricFloat(row, 2),
      avgDuration: metricFloat(row, 3),
    }));

    // Parse devices (with bounce rate)
    const devices = (devicesRes[0]?.rows || []).map((row) => ({
      device: dimStr(row, 0),
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
      bounceRate: metricFloat(row, 2),
    }));

    // Parse countries (with bounce rate)
    const countries = (countriesRes[0]?.rows || []).map((row) => ({
      country: dimStr(row, 0),
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
      bounceRate: metricFloat(row, 2),
    }));

    // Parse source/medium
    const sourceMedium = (sourceMediumRes[0]?.rows || []).map((row) => ({
      source: dimStr(row, 0),
      medium: dimStr(row, 1),
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
      bounceRate: metricFloat(row, 2),
      avgDuration: metricFloat(row, 3),
    }));

    // Parse landing pages
    const landingPages = (landingPagesRes[0]?.rows || []).map((row) => ({
      path: dimStr(row, 0),
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
      bounceRate: metricFloat(row, 2),
      avgDuration: metricFloat(row, 3),
    }));

    // Parse events
    const events = (eventsRes[0]?.rows || []).map((row) => ({
      name: dimStr(row, 0),
      count: metricInt(row, 0),
      users: metricInt(row, 1),
    }));

    // Parse hourly breakdown
    const hourly = (hourlyRes[0]?.rows || []).map((row) => ({
      hour: dimStr(row, 0),
      activeUsers: metricInt(row, 0),
      sessions: metricInt(row, 1),
    }));

    // Parse browsers
    const browsers = (browserRes[0]?.rows || []).map((row) => ({
      browser: dimStr(row, 0),
      sessions: metricInt(row, 0),
      users: metricInt(row, 1),
    }));

    return NextResponse.json({
      overview,
      deltas,
      daily,
      topPages,
      trafficSources,
      devices,
      countries,
      sourceMedium,
      landingPages,
      events,
      hourly,
      browsers,
      range: days,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[GA4 API] Error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch Google Analytics data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
