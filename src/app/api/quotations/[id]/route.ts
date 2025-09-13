import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = await connectToDatabase();
    const q = await db
      .collection("quotations")
      .findOne({ _id: new ObjectId(id) });
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ...q, _id: q._id.toString() });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}
