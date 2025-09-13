import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await connectToDatabase();
    const quotes = await db
      .collection("quotations")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(
      quotes.map((q: any) => ({ ...q, _id: q._id.toString() }))
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = await connectToDatabase();
    const quotation = {
      vehicleNo: (body.vehicleNo || "").toString().trim(),
      customerName: (body.customerName || "").toString().trim(),
      customerPhone: (body.customerPhone || "").toString().trim(),
      isCompanyVehicle: Boolean(body.isCompanyVehicle),
      companyName: (body.companyName || "").toString().trim(),
      subTasks: Array.isArray(body.subTasks) ? body.subTasks : [],
      notes: (body.notes || "").toString().trim(),
      quotedAmount: Number(body.quotedAmount) || 0,
      additionalCharges: Number(body.additionalCharges) || 0,
      totalAmount:
        (Number(body.quotedAmount) || 0) +
        (Number(body.additionalCharges) || 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (!quotation.vehicleNo) {
      return NextResponse.json(
        { error: "Vehicle number is required" },
        { status: 400 }
      );
    }
    const result = await db.collection("quotations").insertOne(quotation);
    return NextResponse.json({
      acknowledged: result.acknowledged,
      insertedId: result.insertedId.toString(),
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create quotation" },
      { status: 500 }
    );
  }
}
