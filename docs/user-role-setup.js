// MongoDB Script to Set User Roles
// Run this in your MongoDB console or MongoDB Compass

// 1. First, login to your app with Clerk to get your userId
// 2. Then run these commands in MongoDB:

// To make a user an ADMIN:
db.user_roles.insertOne({
    clerkUserId: "user_your_clerk_user_id_here", // Replace with actual Clerk User ID
    role: "admin",
    createdAt: new Date(),
    isActive: true
});

// To make a user a MANAGER:
db.user_roles.insertOne({
    clerkUserId: "user_another_clerk_user_id", // Replace with actual Clerk User ID
    role: "manager",
    createdAt: new Date(),
    isActive: true
});

// To make a user STAFF (or just let the system auto-assign):
db.user_roles.insertOne({
    clerkUserId: "user_staff_clerk_user_id", // Replace with actual Clerk User ID
    role: "staff",
    createdAt: new Date(),
    isActive: true
});

// To find your Clerk User ID after logging in:
// 1. Login to your app
// 2. Open browser dev tools
// 3. Go to Application > Local Storage
// 4. Look for Clerk data or check the network requests
// OR check the database after first login (system auto-creates staff role)

// To update an existing user's role:
db.user_roles.updateOne(
    { clerkUserId: "user_your_clerk_user_id_here" },
    { $set: { role: "admin", updatedAt: new Date() } }
);

// To view all user roles:
db.user_roles.find({});

// To delete a user role (user will get default 'staff' role on next login):
db.user_roles.deleteOne({ clerkUserId: "user_id_to_remove" });
