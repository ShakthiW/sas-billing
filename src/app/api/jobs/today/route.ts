import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await connectToDatabase();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Fetch jobs that were moved to "finished" status today
    const completedJobs = await db
      .collection("jobs")
      .find({
        deleted: { $ne: true },
        status: "finished", // Only include finished jobs
        updatedAt: { $gte: today, $lt: tomorrow }, // Only jobs updated today
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // 2. Fetch jobs that were updated today (but not necessarily moved to finished)
    const updatedJobs = await db
      .collection("jobs")
      .find({
        deleted: { $ne: true },
        status: { $ne: "finished" }, // Exclude finished jobs (already in completedJobs)
        updatedAt: { $gte: today, $lt: tomorrow }, // Updated today
        createdAt: { $lt: today }, // Not created today (to avoid overlap with createdJobs)
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // 3. Fetch jobs that were created today
    const createdJobs = await db
      .collection("jobs")
      .find({
        deleted: { $ne: true },
        createdAt: { $gte: today, $lt: tomorrow }, // Created today
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Transform job data function
    const transformJob = (job: any) => ({
      _id: job._id.toString(),
      jobId: job.jobId,
      vehicleNo: job.vehicleNo,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      status: job.status,
      total: job.total || 0,
      isPaid: job.isPaid || false,
      description: job.damageRemarks || job.description || "",
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });

    // Apply transformation to each job collection
    const transformedCompleted = completedJobs.map(transformJob);
    const transformedUpdated = updatedJobs.map(transformJob);
    const transformedCreated = createdJobs.map(transformJob);

    // Calculate statistics for completed jobs
    const finishedJobs = transformedCompleted.filter(
      (job) => job.status === "finished" || job.status === "delivered"
    );

    const totalRevenue = finishedJobs.reduce(
      (sum, job) => sum + (job.total || 0),
      0
    );
    const receivedRevenue = finishedJobs
      .filter((job) => job.isPaid)
      .reduce((sum, job) => sum + (job.total || 0), 0);
    const pendingRevenue = totalRevenue - receivedRevenue;

    // Aggregate statistics
    const stats = {
      // Completed jobs stats
      completedJobs: {
        count: transformedCompleted.length,
        revenue: totalRevenue,
        received: receivedRevenue,
        pending: pendingRevenue,
      },
      // Updated jobs stats
      updatedJobs: {
        count: transformedUpdated.length,
      },
      // Created jobs stats
      createdJobs: {
        count: transformedCreated.length,
      },
      // Total stats
      totalJobs:
        transformedCompleted.length +
        transformedUpdated.length +
        transformedCreated.length,
    };

    return NextResponse.json({
      jobs: {
        completed: transformedCompleted,
        updated: transformedUpdated,
        created: transformedCreated,
      },
      stats,
      date: today.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Failed to fetch today's jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch today's jobs" },
      { status: 500 }
    );
  }
}
