import { connectToDatabase } from "@/app/api/actions";

export async function initializeDatabase() {
    try {
        const db = await connectToDatabase();
        
        // Create unique index on user_roles collection to prevent duplicates
        try {
            await db.collection("user_roles").createIndex(
                { clerkUserId: 1 }, 
                { 
                    unique: true,
                    name: "clerkUserId_unique"
                }
            );
            console.log("Created unique index on user_roles.clerkUserId");
        } catch (error: any) {
            if (error.code !== 11000 && !error.message?.includes("already exists")) {
                console.error("Failed to create index on user_roles:", error);
            }
        }
        
        // Add other database initialization tasks here as needed
        
        return { success: true };
    } catch (error) {
        console.error("Database initialization failed:", error);
        return { success: false, error };
    }
}