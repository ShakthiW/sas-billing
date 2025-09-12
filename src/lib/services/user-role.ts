import { connectToDatabase } from "@/app/api/actions";

export async function getUserRole(userId: string, userEmail?: string): Promise<'admin' | 'manager' | 'staff' | 'tax'> {
    // Check for tax role email first
    if (userEmail === 'kavirurh@gmail.com') {
        return 'tax';
    }
    
    const db = await connectToDatabase();

    // Check if user exists in our user_roles collection
    let userRole = await db.collection('user_roles').findOne({ clerkUserId: userId });

    if (!userRole) {
        // Check if there are any duplicates that might have been missed
        const allRoles = await db.collection('user_roles').find({ clerkUserId: userId }).toArray();
        
        if (allRoles.length > 0) {
            // Found duplicates - use the most recent one
            userRole = allRoles.sort((a, b) => {
                const dateA = a.updatedAt || a.createdAt;
                const dateB = b.updatedAt || b.createdAt;
                return dateB.getTime() - dateA.getTime();
            })[0];
            
            // Clean up duplicates if found
            if (allRoles.length > 1) {
                const idsToDelete = allRoles.slice(1).map(r => r._id);
                await db.collection('user_roles').deleteMany({ _id: { $in: idsToDelete } });
            }
            
            return userRole.role;
        }
        
        // Only create a default role if explicitly needed, not automatically
        // Return 'staff' as default without creating a database entry
        // The admin panel should be used to explicitly assign roles
        return 'staff';
    }

    return userRole.role;
}
