#!/usr/bin/env node

/**
 * Daily Admin Password Reset Script
 * 
 * This script automatically generates a new admin password every day.
 * It can be run via cron job or any task scheduler.
 * 
 * Setup Instructions:
 * 1. Make sure environment variables are set (MONGODB_URI, CRON_SECRET_TOKEN)
 * 2. Add to crontab: 0 7 * * * /path/to/node /path/to/daily-password-reset.js
 * 3. Or set up with your preferred task scheduler
 * 
 * For deployment platforms like Vercel:
 * - Use Vercel Cron Jobs feature
 * - Create API endpoint at /api/cron/daily-password
 * - Configure cron expression: 0 7 * * *
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const crypto = require('crypto');

async function generateDailyPassword() {
    const mongoUri = process.env.MONGODB_URI;
    const secretToken = process.env.CRON_SECRET_TOKEN;

    if (!mongoUri) {
        console.error('❌ Error: MONGODB_URI not found in environment variables');
        process.exit(1);
    }

    if (!secretToken) {
        console.warn('⚠️ Warning: CRON_SECRET_TOKEN not set. This should be set for production.');
    }

    let client;
    try {
        // Connect to MongoDB
        client = new MongoClient(mongoUri);
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Check if password already exists for today
        const existingPassword = await db.collection("adminPasswords").findOne({
            date: today,
            isActive: true
        });

        if (existingPassword) {
            console.log(`📋 Admin password already exists for ${today}: ${existingPassword.password}`);
            return;
        }

        // Generate new password (8 characters: 4 numbers + 4 letters)
        const numbers = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const letters = crypto.randomBytes(2).toString('hex').toUpperCase();
        const password = numbers + letters;

        // Hash the password
        const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

        // Set expiration to end of day
        const expiresAt = new Date();
        expiresAt.setHours(23, 59, 59, 999);

        // Deactivate previous passwords
        await db.collection("adminPasswords").updateMany(
            { isActive: true },
            { $set: { isActive: false, updatedAt: new Date() } }
        );

        // Create new password record
        const adminPassword = {
            date: today,
            password: password,
            hashedPassword: hashedPassword,
            createdAt: new Date(),
            expiresAt: expiresAt,
            isActive: true,
            usageCount: 0
        };

        await db.collection("adminPasswords").insertOne(adminPassword);

        console.log('🔐 New admin password generated successfully!');
        console.log(`📅 Date: ${today}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`⏰ Expires: ${expiresAt.toLocaleString()}`);

        // Log the password generation event
        await db.collection("adminPasswordLogs").insertOne({
            action: 'password_generated',
            date: today,
            password: password,
            generatedAt: new Date(),
            method: 'automated_script'
        });

    } catch (error) {
        console.error('❌ Error generating daily admin password:', error);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('📊 Database connection closed');
        }
    }
}

// Run the script
generateDailyPassword().then(() => {
    console.log('✅ Daily password generation completed');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
});
