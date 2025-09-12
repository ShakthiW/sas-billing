// Ways to find your Clerk User ID:

// Method 1: Check the database after first login
// The system automatically creates a record in user_roles collection
db.user_roles.find({}).sort({ createdAt: -1 }).limit(5);

// Method 2: Add temporary logging (for development)
// Add this to your useUserPermissions hook temporarily:
console.log("Current user ID:", user?.id);

// Method 3: Check Clerk Dashboard
// 1. Go to https://dashboard.clerk.com
// 2. Select your application
// 3. Go to Users section
// 4. Find your user and copy the User ID

// Method 4: Browser Developer Tools
// 1. Login to your app
// 2. Open Dev Tools (F12)
// 3. Go to Console
// 4. Type: JSON.parse(localStorage.getItem('__clerk_client')).user.id

// Method 5: API endpoint to get current user info
// Create a temporary API endpoint:
// /src/app/api/debug/user/route.ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
    const { userId } = await auth();
    const user = await currentUser();

    return NextResponse.json({
        userId: userId,
        user: user,
        email: user?.emailAddresses[0]?.emailAddress
    });
}
