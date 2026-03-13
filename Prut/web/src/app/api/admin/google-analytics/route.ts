import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { validateAdminSession } from '@/lib/admin/admin-security';
import { logger } from '@/lib/logger';

// Initialize GA4 client with service account credentials
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
      return NextResponse.json(
        { error: 'GA4_PROPERTY_ID not configured' },
        { status: 500 }
      );
    }

    const client = getAnalyticsClient();
    if (!client) {
      return NextResponse.json(
        { error: 'Google Analytics credentials not configured' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '28'; // days
    const days = Math.min(parseInt(range, 10) || 28, 365);

    const startDate = `${days}daysAgo`;
    const endDate = 'today';
    const propertyId = `properties/${GA_PROPERTY_ID}`;

    // Run all GA4 queries in parallel
    const [overviewRes, dailyRes, pagesRes, sourcesRes, devicesRes, countriesRes] =
      await Promise.all([
        // 1. Overview metrics
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
          ],
        }),

        // 2. Daily breakdown
        client.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date', orderType: 'ALPHANUMERIC' } }],
        }),

        // 3. Top pages
        client.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'activeUsers' },
            { name: 'averageSessionDuration' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 15,
        }),

        // 4. Traffic sources
        client.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
            { name: 'bounceRate' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        }),

        // 5. Devices
        client.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        }),

        // 6. Countries
        client.runReport({
          property: propertyId,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'country' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        }),
      ]);

    // Parse overview
    const overviewRow = overviewRes[0]?.rows?.[0];
    const overview = {
      activeUsers: parseInt(overviewRow?.metricValues?.[0]?.value || '0'),
      sessions: parseInt(overviewRow?.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(overviewRow?.metricValues?.[2]?.value || '0'),
      bounceRate: parseFloat(overviewRow?.metricValues?.[3]?.value || '0'),
      avgSessionDuration: parseFloat(overviewRow?.metricValues?.[4]?.value || '0'),
      newUsers: parseInt(overviewRow?.metricValues?.[5]?.value || '0'),
    };

    // Parse daily data
    const daily = (dailyRes[0]?.rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || '',
      activeUsers: parseInt(row.metricValues?.[0]?.value || '0'),
      sessions: parseInt(row.metricValues?.[1]?.value || '0'),
      pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
    }));

    // Parse top pages
    const topPages = (pagesRes[0]?.rows || []).map((row) => ({
      path: row.dimensionValues?.[0]?.value || '',
      pageViews: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      avgDuration: parseFloat(row.metricValues?.[2]?.value || '0'),
    }));

    // Parse traffic sources
    const trafficSources = (sourcesRes[0]?.rows || []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues?.[2]?.value || '0'),
    }));

    // Parse devices
    const devices = (devicesRes[0]?.rows || []).map((row) => ({
      device: row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
    }));

    // Parse countries
    const countries = (countriesRes[0]?.rows || []).map((row) => ({
      country: row.dimensionValues?.[0]?.value || '',
      sessions: parseInt(row.metricValues?.[0]?.value || '0'),
      users: parseInt(row.metricValues?.[1]?.value || '0'),
    }));

    return NextResponse.json({
      overview,
      daily,
      topPages,
      trafficSources,
      devices,
      countries,
      range: days,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error('[GA4 API] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch Google Analytics data' },
      { status: 500 }
    );
  }
}
