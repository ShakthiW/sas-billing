import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserRole } from "@/lib/services/user-role";
import {
    generateDailyAdminPassword,
    validateAdminPassword,
    getCurrentAdminPassword,
    getAdminPasswordStats,
    logAdminPasswordUsage,
    ensureDailyAdminPassword,
    forceGenerateWeeklyPassword
} from "@/lib/services/admin-password";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can view admin passwords"
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'current') {
            const result = await getCurrentAdminPassword();
            return NextResponse.json(result);
        }

        if (action === 'stats') {
            const days = parseInt(searchParams.get('days') || '30');
            const result = await getAdminPasswordStats(days);
            return NextResponse.json(result);
        }

        if (action === 'generate') {
            const result = await forceGenerateWeeklyPassword();
            return NextResponse.json(result);
        }

        if (action === 'ensure') {
            const result = await ensureDailyAdminPassword();
            return NextResponse.json(result);
        }

        return NextResponse.json({
            error: "Invalid action. Use 'current', 'stats', 'generate', or 'ensure'"
        }, { status: 400 });

    } catch (error: any) {
        console.error("GET /api/admin/password:", error);
        return NextResponse.json(
            { error: error.message || "Failed to handle admin password request" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can use admin passwords"
            }, { status: 403 });
        }

        const body = await request.json();
        const { password, action, targetId, targetType, metadata } = body;

        if (!password || !action) {
            return NextResponse.json({
                error: "Missing required fields: password, action"
            }, { status: 400 });
        }

        // Validate the password
        const validation = await validateAdminPassword(password);
        if (!validation.isValid) {
            return NextResponse.json({
                error: validation.error || "Invalid admin password"
            }, { status: 401 });
        }

        // Get request headers for logging
        const headersList = await headers();
        const ipAddress = headersList.get('x-forwarded-for') ||
            headersList.get('x-real-ip') ||
            'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        // Log the password usage
        await logAdminPasswordUsage(
            validation.passwordId!,
            userId,
            action,
            targetId,
            targetType,
            metadata,
            ipAddress,
            userAgent
        );

        return NextResponse.json({
            success: true,
            message: "Admin password validated successfully"
        });

    } catch (error: any) {
        console.error("POST /api/admin/password:", error);
        return NextResponse.json(
            { error: error.message || "Failed to validate admin password" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can generate admin passwords"
            }, { status: 403 });
        }

        // Force generate new password (even if one exists for this week)
        const result = await forceGenerateWeeklyPassword();

        if (result.success) {
            // Log the password generation
            const headersList = await headers();
            const ipAddress = headersList.get('x-forwarded-for') ||
                headersList.get('x-real-ip') ||
                'unknown';
            const userAgent = headersList.get('user-agent') || 'unknown';

            // We don't have passwordId yet since we just generated it, so we'll skip logging for now
            console.log(`Admin password generated by ${userId} from ${ipAddress}`);
        }

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("PUT /api/admin/password:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate admin password" },
            { status: 500 }
        );
    }
}
