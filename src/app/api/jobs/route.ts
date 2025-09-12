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
    
    // Fetch all non-deleted jobs
    const jobs = await db
      .collection("jobs")
      .find({ deleted: { $ne: true } })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    // Transform jobs to include necessary fields
    const transformedJobs = jobs.map(job => ({
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
      updatedAt: job.updatedAt
    }));

    return NextResponse.json(transformedJobs);

  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}