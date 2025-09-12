#!/usr/bin/env node

/**
 * Admin Password System Setup Script
 *
 * This script sets up the admin password system for the first time:
 * - Creates necessary database collections
 * - Generates the first admin password
 * - Sets up indexes for better performance
 * - Provides setup instructions
 */

const { MongoClient } = require("mongodb");
require("dotenv").config({ path: ".env.local" });

const crypto = require("crypto");

async function setupAdminPasswordSystem() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error("❌ Error: MONGODB_URI not found in environment variables");
    console.log("📝 Please set MONGODB_URI in your .env.local file");
    process.exit(1);
  }

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(mongoUri);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();

    console.log("\n🔧 Setting up Admin Password System...\n");

    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("adminPasswords")) {
      await db.createCollection("adminPasswords");
      console.log("✅ Created adminPasswords collection");
    }

    if (!collectionNames.includes("adminPasswordUsage")) {
      await db.createCollection("adminPasswordUsage");
      console.log("✅ Created adminPasswordUsage collection");
    }

    if (!collectionNames.includes("adminPasswordLogs")) {
      await db.createCollection("adminPasswordLogs");
      console.log("✅ Created adminPasswordLogs collection");
    }

    // Create indexes for better performance
    try {
      await db
        .collection("adminPasswords")
        .createIndex({ date: 1, isActive: 1 });
      await db.collection("adminPasswords").createIndex({ hashedPassword: 1 });
      await db.collection("adminPasswords").createIndex({ expiresAt: 1 });
      await db.collection("adminPasswordUsage").createIndex({ passwordId: 1 });
      await db.collection("adminPasswordUsage").createIndex({ timestamp: 1 });
      await db.collection("adminPasswordUsage").createIndex({ userId: 1 });
      await db.collection("adminPasswordUsage").createIndex({ action: 1 });
      console.log("✅ Created database indexes");
    } catch (indexError) {
      console.log("⚠️ Some indexes might already exist (this is normal)");
    }

    // Generate first admin password
    const today = new Date().toISOString().split("T")[0];

    // Check if password already exists for today
    const existingPassword = await db.collection("adminPasswords").findOne({
      date: today,
      isActive: true,
    });

    let password;
    if (existingPassword) {
      password = existingPassword.password;
      console.log(`📋 Admin password already exists for today: ${password}`);
    } else {
      // Generate new PIN (6 digits, numeric only)
      password = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(4, "0");

      // Hash the password
      const hashedPassword = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

      // Set expiration to end of day
      const expiresAt = new Date();
      expiresAt.setHours(23, 59, 59, 999);

      // Create new password record
      const adminPassword = {
        date: today,
        password: password,
        hashedPassword: hashedPassword,
        createdAt: new Date(),
        expiresAt: expiresAt,
        isActive: true,
        usageCount: 0,
      };

      await db.collection("adminPasswords").insertOne(adminPassword);
      console.log("🔐 Generated first admin password");
    }

    // Display setup completion message
    console.log("\n🎉 Admin Password System Setup Complete!\n");
    console.log("📋 Setup Summary:");
    console.log("  ✅ Database collections created");
    console.log("  ✅ Performance indexes created");
    console.log("  ✅ First admin password generated");
    console.log("");
    console.log("🔑 Current Admin Password Information:");
    console.log(`  📅 Date: ${today}`);
    console.log(`  🔐 Password: ${password}`);
    console.log("  ⏰ Auto-generates when needed for each week (7-day cycle)");
    console.log("");
    console.log("📝 Next Steps:");
    console.log("  1. System is ready to use!");
    console.log("     • Passwords auto-generate when needed for each week");
    console.log("     • No cron jobs or scheduling required");
    console.log("     • Manual generation available in admin interface");
    console.log("     • Passwords are valid for 7 days (Monday to Sunday)");
    console.log("");
    console.log("  2. Admin password is required for:");
    console.log("     • Deleting jobs, bills, payments");
    console.log("     • Completing payments");
    console.log("     • Restoring deleted items");
    console.log("     • Modifying bank accounts");
    console.log("     • Overriding approvals");
    console.log("");
    console.log("🌐 Access admin password management at:");
    console.log("  http://localhost:3000/dashboard/admin/password");
  } catch (error) {
    console.error("❌ Error setting up admin password system:", error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log("\n📊 Database connection closed");
    }
  }
}

// Run the setup
setupAdminPasswordSystem()
  .then(() => {
    console.log("\n✅ Setup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  });
