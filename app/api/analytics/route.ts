import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { NextResponse } from "next/server";

// Initialize the Google Analytics client securely on the server
const analyticsDataClient = new BetaAnalyticsDataClient({
  credentials: {
    client_email: process.env.GA_CLIENT_EMAIL,
    private_key: process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n"), // Fixes newline formatting
  },
});

export async function GET() {
  try {
    const propertyId = process.env.GA_PROPERTY_ID;

    // Fetch Multiple Reports in one go
    const [pageViewsResponse, deviceResponse] = await Promise.all([
      // 1. Most Visited Pages (Last 7 Days)
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5,
      }),
      // 2. Mobile vs Desktop traffic
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "activeUsers" }],
      }),
    ]);

    // Format the raw Google Data into clean JSON for our frontend
    const topPages = pageViewsResponse[0].rows?.map((row) => ({
      path: row.dimensionValues?.[0].value,
      views: row.metricValues?.[0].value,
      users: row.metricValues?.[1].value,
    })) || [];

    const deviceData = deviceResponse[0].rows?.map((row) => ({
      device: row.dimensionValues?.[0].value,
      users: row.metricValues?.[0].value,
    })) || [];

    return NextResponse.json({
      success: true,
      data: { topPages, deviceData }
    });

  } catch (error) {
    console.error("GA4 API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}