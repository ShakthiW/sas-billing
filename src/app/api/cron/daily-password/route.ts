import { NextRequest, NextResponse } from "next/server";
import { generateDailyAdminPassword } from "@/lib/services/admin-password";

export async function GET(request: NextRequest) {
    try {
        // Simple security check - only allow from localhost or with a secret token
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        const expectedToken = process.env.CRON_SECRET_TOKEN;

        if (!expectedToken || token !== expectedToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Generate the daily password
        const result = await generateDailyAdminPassword();

        if (result.success) {
            console.log(`Daily admin password generated successfully at ${new Date().toISOString()}`);
            return NextResponse.json({
                success: true,
                message: "Daily admin password generated",
                timestamp: new Date().toISOString()
            });
        } else {
            console.error(`Failed to generate daily admin password: ${result.error}`);
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Cron job error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to run cron job" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    // Handle webhook-style calls (e.g., from Vercel Cron, GitHub Actions, etc.)
    return GET(request);
}
