#!/usr/bin/env node

/**
 * Setup Admin User Script
 * 
 * This script helps you set up the first admin user for your SAS Billing System.
 * Run this script after creating an account through the Clerk sign-up flow.
 * 
 * Usage:
 * node setup-admin.js <clerk-user-id>
 * 
 * To find your Clerk User ID:
 * 1. Sign up/Sign in to your application
 * 2. Go to your Clerk Dashboard
 * 3. Navigate to Users section
 * 4. Copy the User ID from there
 * 
 * OR use the get-user-id.js script while logged in
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function setupAdmin(clerkUserId) {
    if (!clerkUserId) {
        console.error('❌ Error: Clerk User ID is required');
        console.log('📝 Usage: node setup-admin.js <clerk-user-id>');
        console.log('💡 Tip: Use get-user-id.js to find your user ID');
        process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error('❌ Error: MONGODB_URI not found in environment variables');
        console.log('📝 Please set MONGODB_URI in your .env.local file');
        process.exit(1);
    }

    let client;
    try {
        // Connect to MongoDB
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const userRolesCollection = db.collection('user_roles');

        // Check if user already exists
        const existingUser = await userRolesCollection.findOne({ clerkUserId });

        if (existingUser) {
            console.log(`📋 User ${clerkUserId} already exists with role: ${existingUser.role}`);

            if (existingUser.role === 'admin') {
                console.log('✅ User is already an admin!');
                return;
            }

            // Update to admin
            const result = await userRolesCollection.updateOne(
                { clerkUserId },
                {
                    $set: {
                        role: 'admin',
                        updatedAt: new Date()
                    }
                }
            );

            if (result.modifiedCount > 0) {
                console.log('✅ Successfully updated user to admin role!');
            } else {
                console.log('⚠️ No changes made');
            }
        } else {
            // Create new admin user
            const newAdminUser = {
                clerkUserId,
                role: 'admin',
                createdAt: new Date(),
                isActive: true
            };

            await userRolesCollection.insertOne(newAdminUser);
            console.log('✅ Successfully created new admin user!');
        }

        console.log('\n🎉 Setup complete!');
        console.log('📱 You can now sign in to your application with admin privileges');
        console.log('🔧 Admin features include:');
        console.log('  • User Management');
        console.log('  • Recycle Bin');
        console.log('  • Audit Logs');
        console.log('  • All approval permissions');

    } catch (error) {
        console.error('❌ Error setting up admin user:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('📊 Database connection closed');
        }
    }
}

// Get clerk user ID from command line arguments
const clerkUserId = process.argv[2];
setupAdmin(clerkUserId);
