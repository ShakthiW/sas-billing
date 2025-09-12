import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";
import crypto from "crypto";

export interface AdminPassword {
  _id?: ObjectId;
  weekId: string; // YYYY-WW format (e.g., "2025-W27")
  date: string; // YYYY-MM-DD format (for backward compatibility)
  password: string;
  hashedPassword: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
}

export interface AdminPasswordUsage {
  _id?: ObjectId;
  passwordId: ObjectId;
  userId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Get the current week identifier (YYYY-WW format based on Monday as start of week)
 */
function getCurrentWeekId(): string {
  const now = new Date();
  const year = now.getFullYear();

  // Get Monday of current week
  const monday = new Date(now);
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  monday.setDate(diff);

  // Calculate week number
  const firstMonday = new Date(year, 0, 1);
  const firstDay = firstMonday.getDay();
  const firstMondayOfYear = new Date(
    year,
    0,
    1 + (firstDay === 0 ? 1 : 8 - firstDay)
  );

  const weekNumber = Math.ceil(
    ((monday.getTime() - firstMondayOfYear.getTime()) / 86400000 + 1) / 7
  );

  return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

/**
 * Ensures a valid admin password exists for this week, generates one if needed
 */
export async function ensureDailyAdminPassword(): Promise<{
  success: boolean;
  password?: string;
  error?: string;
}> {
  try {
    const db = await connectToDatabase();
    const currentWeek = getCurrentWeekId(); // YYYY-WW format

    // Check if password already exists for this week and is still valid
    const existingPassword = await db.collection("adminPasswords").findOne({
      weekId: currentWeek,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (existingPassword) {
      return {
        success: true,
        password: existingPassword.password,
      };
    }
    // Generate new password if none exists or expired
    return await generateDailyAdminPassword();
  } catch (error: any) {
    console.error("Failed to ensure weekly admin password:", error);
    return {
      success: false,
      error: error.message || "Failed to ensure admin password",
    };
  }
}
/**
 * Generates a new weekly admin password (internal function)
 * If forceNew is true, generates new password even if one exists for the week
 */
export async function generateDailyAdminPassword(
  forceNew: boolean = false
): Promise<{ success: boolean; password?: string; error?: string }> {
  try {
    const db = await connectToDatabase();
    const currentWeek = getCurrentWeekId(); // YYYY-WW format
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format (for compatibility)

    // Check if password already exists for this week
    if (!forceNew) {
      const existingPassword = await db.collection("adminPasswords").findOne({
        weekId: currentWeek,
        isActive: true,
      });

      if (existingPassword) {
        return {
          success: true,
          password: existingPassword.password,
        };
      }
    }
    // Generate new PIN (6 digits, numeric only)
    const password = crypto.randomInt(0, 1_000_000).toString().padStart(4, "0");

    // Hash the password
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    // Set expiration to end of Sunday (7 days from Monday)
    const expiresAt = new Date();
    const currentDay = expiresAt.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay; // Days until end of week
    expiresAt.setDate(expiresAt.getDate() + daysUntilSunday);
    expiresAt.setHours(23, 59, 59, 999);

    // Deactivate previous passwords
    await db
      .collection("adminPasswords")
      .updateMany(
        { isActive: true },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

    // Create new password record
    const adminPassword: AdminPassword = {
      weekId: currentWeek,
      date: today,
      password: password,
      hashedPassword: hashedPassword,
      createdAt: new Date(),
      expiresAt: expiresAt,
      isActive: true,
      usageCount: 0,
    };

    await db.collection("adminPasswords").insertOne(adminPassword);

    return {
      success: true,
      password: password,
    };
  } catch (error: any) {
    console.error("Failed to generate daily admin password:", error);
    return {
      success: false,
      error: error.message || "Failed to generate admin password",
    };
  }
}

/**
 * Forces generation of a new weekly admin password (for manual generation)
 */
export async function forceGenerateWeeklyPassword(): Promise<{
  success: boolean;
  password?: string;
  error?: string;
}> {
  return await generateDailyAdminPassword(true);
}

/**
 * Validates admin password (automatically ensures a password exists for today)
 */
export async function validateAdminPassword(
  password: string
): Promise<{ isValid: boolean; passwordId?: ObjectId; error?: string }> {
  try {
    // First, ensure we have a valid password for today
    await ensureDailyAdminPassword();

    const db = await connectToDatabase();
    // Enforce 6-digit numeric PIN format
    if (!/^\d{6}$/.test(password)) {
      return {
        isValid: false,
        error: "PIN must be exactly 6 digits",
      };
    }
    const hashedPassword = crypto
      .createHash("sha256")
      .update(password)
      .digest("hex");

    const adminPassword = await db.collection("adminPasswords").findOne({
      hashedPassword: hashedPassword,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!adminPassword) {
      return {
        isValid: false,
        error: "Invalid or expired admin password",
      };
    }

    return {
      isValid: true,
      passwordId: adminPassword._id,
    };
  } catch (error: any) {
    console.error("Failed to validate admin password:", error);
    return {
      isValid: false,
      error: error.message || "Failed to validate password",
    };
  }
}

/**
 * Logs admin password usage
 */
export async function logAdminPasswordUsage(
  passwordId: ObjectId,
  userId: string,
  action: string,
  targetId?: string,
  targetType?: string,
  metadata?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await connectToDatabase();

    // Log the usage
    const usage: AdminPasswordUsage = {
      passwordId,
      userId,
      action,
      targetId,
      targetType,
      metadata,
      timestamp: new Date(),
      ipAddress,
      userAgent,
    };

    await db.collection("adminPasswordUsage").insertOne(usage);

    // Update password usage count and last used time
    await db.collection("adminPasswords").updateOne(
      { _id: passwordId },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      }
    );

    return { success: true };
  } catch (error: any) {
    console.error("Failed to log admin password usage:", error);
    return {
      success: false,
      error: error.message || "Failed to log password usage",
    };
  }
}

/**
 * Gets current active admin password (automatically generates if needed)
 */
export async function getCurrentAdminPassword(): Promise<{
  success: boolean;
  password?: string;
  expiresAt?: Date;
  error?: string;
}> {
  try {
    // Ensure we have a valid password for this week
    const ensureResult = await ensureDailyAdminPassword();
    if (!ensureResult.success) {
      return {
        success: false,
        error: ensureResult.error || "Failed to ensure admin password",
      };
    }

    const db = await connectToDatabase();
    const currentWeek = getCurrentWeekId();

    const adminPassword = await db.collection("adminPasswords").findOne({
      weekId: currentWeek,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!adminPassword) {
      return {
        success: false,
        error: "No active admin password found",
      };
    }

    return {
      success: true,
      password: adminPassword.password,
      expiresAt: adminPassword.expiresAt,
    };
  } catch (error: any) {
    console.error("Failed to get current admin password:", error);
    return {
      success: false,
      error: error.message || "Failed to get admin password",
    };
  }
}

/**
 * Gets admin password usage statistics
 */
export async function getAdminPasswordStats(days: number = 30): Promise<{
  success: boolean;
  stats?: {
    totalUsage: number;
    actionBreakdown: { action: string; count: number }[];
    userBreakdown: { userId: string; count: number }[];
    dailyUsage: { date: string; count: number }[];
  };
  error?: string;
}> {
  try {
    const db = await connectToDatabase();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const usageData = await db
      .collection("adminPasswordUsage")
      .find({ timestamp: { $gte: fromDate } })
      .toArray();

    const totalUsage = usageData.length;

    // Action breakdown
    const actionCounts = usageData.reduce((acc, usage) => {
      acc[usage.action] = (acc[usage.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionBreakdown = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    // User breakdown
    const userCounts = usageData.reduce((acc, usage) => {
      acc[usage.userId] = (acc[usage.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userBreakdown = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);

    // Daily usage
    const dailyCounts = usageData.reduce((acc, usage) => {
      const date = usage.timestamp.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dailyUsage = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      success: true,
      stats: {
        totalUsage,
        actionBreakdown,
        userBreakdown,
        dailyUsage,
      },
    };
  } catch (error: any) {
    console.error("Failed to get admin password stats:", error);
    return {
      success: false,
      error: error.message || "Failed to get password stats",
    };
  }
}

/**
 * Actions that require admin password
 */
export const ADMIN_PASSWORD_ACTIONS = {
  DELETE_JOB: "delete_job",
  DELETE_BILL: "delete_bill",
  DELETE_PAYMENT: "delete_payment",
  APPROVE_PAYMENT: "approve_payment",
  COMPLETE_PAYMENT: "complete_payment",
  FINALIZE_BILL: "finalize_bill",
  RESTORE_ITEM: "restore_item",
  MODIFY_BANK_ACCOUNT: "modify_bank_account",
  OVERRIDE_APPROVAL: "override_approval",
  MODIFY_USER_ROLE: "modify_user_role",
} as const;

export type AdminPasswordAction =
  (typeof ADMIN_PASSWORD_ACTIONS)[keyof typeof ADMIN_PASSWORD_ACTIONS];
