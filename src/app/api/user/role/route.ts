import { NextRequest, NextResponse } from "next/server";
import { getUserRole } from "@/lib/services/user-role";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Get the current user's email from Clerk
        const user = await currentUser();
        const userEmail = user?.emailAddresses[0]?.emailAddress;

        const role = await getUserRole(userId, userEmail);

        return NextResponse.json({ role });

    } catch (error) {
        console.error('Error fetching user role:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
