import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import { getUserRole } from "@/lib/services/user-role";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can manage user roles"
            }, { status: 403 });
        }

        const db = await connectToDatabase();
        
        // Get all users and group by clerkUserId to remove duplicates
        const allUsers = await db.collection("user_roles").find({}).toArray();
        const uniqueUsersMap = new Map();
        
        // Keep only the most recently updated/created entry for each clerkUserId
        allUsers.forEach(user => {
            const existing = uniqueUsersMap.get(user.clerkUserId);
            if (!existing || 
                (user.updatedAt && (!existing.updatedAt || user.updatedAt > existing.updatedAt)) ||
                (!existing.updatedAt && user.createdAt > existing.createdAt)) {
                uniqueUsersMap.set(user.clerkUserId, user);
            }
        });
        
        const users = Array.from(uniqueUsersMap.values());

        return NextResponse.json({
            success: true,
            users: users.map(user => ({
                ...user,
                _id: user._id.toString()
            }))
        });
    } catch (error: any) {
        console.error("GET /api/admin/users:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch users" },
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
                error: "Only administrators can manage user roles"
            }, { status: 403 });
        }

        const body = await request.json();
        const { clerkUserId, role } = body;

        if (!clerkUserId || !role) {
            return NextResponse.json({
                error: "Missing required fields: clerkUserId, role"
            }, { status: 400 });
        }

        if (!['admin', 'manager', 'staff'].includes(role)) {
            return NextResponse.json({
                error: "Invalid role. Must be: admin, manager, or staff"
            }, { status: 400 });
        }

        const db = await connectToDatabase();

        // First, remove any duplicate entries for this user
        const duplicates = await db.collection("user_roles").find({ clerkUserId }).toArray();
        if (duplicates.length > 1) {
            // Keep the most recent one and delete others
            const sortedDuplicates = duplicates.sort((a, b) => {
                const dateA = a.updatedAt || a.createdAt;
                const dateB = b.updatedAt || b.createdAt;
                return dateB.getTime() - dateA.getTime();
            });
            
            const idsToDelete = sortedDuplicates.slice(1).map(d => d._id);
            if (idsToDelete.length > 0) {
                await db.collection("user_roles").deleteMany({ _id: { $in: idsToDelete } });
            }
        }
        
        // Check if user role exists
        const existingUser = await db.collection("user_roles").findOne({ clerkUserId });

        if (existingUser) {
            // Update existing role
            await db.collection("user_roles").updateOne(
                { clerkUserId },
                {
                    $set: {
                        role,
                        updatedAt: new Date(),
                        updatedBy: userId
                    }
                }
            );
        } else {
            // Create new role
            await db.collection("user_roles").insertOne({
                clerkUserId,
                role,
                createdAt: new Date(),
                createdBy: userId,
                isActive: true
            });
        }

        return NextResponse.json({
            success: true,
            message: `User role updated to ${role}`
        });
    } catch (error: any) {
        console.error("POST /api/admin/users:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update user role" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = await getUserRole(userId);
        if (userRole !== 'admin') {
            return NextResponse.json({
                error: "Only administrators can manage user roles"
            }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const clerkUserId = searchParams.get('clerkUserId');

        if (!clerkUserId) {
            return NextResponse.json({
                error: "Missing clerkUserId parameter"
            }, { status: 400 });
        }

        const db = await connectToDatabase();
        // Delete ALL entries for this clerkUserId to clean up duplicates
        const result = await db.collection("user_roles").deleteMany({ clerkUserId });

        return NextResponse.json({
            success: true,
            message: "User role deleted successfully"
        });
    } catch (error: any) {
        console.error("DELETE /api/admin/users:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete user role" },
            { status: 500 }
        );
    }
}
