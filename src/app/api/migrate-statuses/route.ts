import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { migrateLegacyJobStatuses } from "@/app/api/actions";
import { getUserRole } from "@/lib/services/user-role";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only allow admin users to run migration
        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only admin users can run migrations"
            }, { status: 403 });
        }

        const result = await migrateLegacyJobStatuses();

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Successfully migrated ${result.updated} jobs from legacy statuses`,
                updated: result.updated
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("Migration API error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Failed to run migration"
        }, { status: 500 });
    }
}
