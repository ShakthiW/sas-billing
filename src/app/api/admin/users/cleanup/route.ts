import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { getUserRole } from "@/lib/services/user-role";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can run cleanup operations"
            }, { status: 403 });
        }

        const db = await connectToDatabase();
        
        // Get all user roles
        const allUserRoles = await db.collection("user_roles").find({}).toArray();
        
        // Group by clerkUserId
        const userGroups = new Map<string, any[]>();
        allUserRoles.forEach(user => {
            const existing = userGroups.get(user.clerkUserId) || [];
            existing.push(user);
            userGroups.set(user.clerkUserId, existing);
        });
        
        let duplicatesRemoved = 0;
        let usersProcessed = 0;
        
        // Process each group
        for (const [clerkUserId, users] of userGroups) {
            if (users.length > 1) {
                // Sort by most recent first
                users.sort((a, b) => {
                    const dateA = a.updatedAt || a.createdAt;
                    const dateB = b.updatedAt || b.createdAt;
                    return dateB.getTime() - dateA.getTime();
                });
                
                // Keep the first (most recent) and delete the rest
                const idsToDelete = users.slice(1).map(u => u._id);
                
                if (idsToDelete.length > 0) {
                    await db.collection("user_roles").deleteMany({ 
                        _id: { $in: idsToDelete } 
                    });
                    duplicatesRemoved += idsToDelete.length;
                }
                
                usersProcessed++;
            }
        }
        
        // Try to create a unique index on clerkUserId to prevent future duplicates
        try {
            await db.collection("user_roles").createIndex(
                { clerkUserId: 1 }, 
                { unique: true }
            );
        } catch (indexError) {
            // Index might already exist or there might be other issues
            console.log("Index creation result:", indexError);
        }
        
        return NextResponse.json({
            success: true,
            message: `Cleanup completed. Removed ${duplicatesRemoved} duplicate entries from ${usersProcessed} users.`,
            duplicatesRemoved,
            usersProcessed,
            totalUsers: userGroups.size
        });
    } catch (error: any) {
        console.error("POST /api/admin/users/cleanup:", error);
        return NextResponse.json(
            { error: error.message || "Failed to cleanup duplicate users" },
            { status: 500 }
        );
    }
}