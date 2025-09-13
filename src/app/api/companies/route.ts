import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const db = await connectToDatabase();
    const companies = await db
      .collection("companies")
      .find({})
      .sort({ name: 1 })
      .toArray();
    return NextResponse.json(
      companies.map((c: any) => ({ _id: c._id.toString(), name: c.name }))
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body?.name || "").toString().trim();
    if (!name)
      return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const db = await connectToDatabase();
    const existing = await db
      .collection("companies")
      .findOne({ name: { $regex: `^${name}$`, $options: "i" } });
    if (existing) {
      return NextResponse.json(
        { error: "Company already exists" },
        { status: 409 }
      );
    }
    const result = await db
      .collection("companies")
      .insertOne({ name, createdAt: new Date() });
    return NextResponse.json({ _id: result.insertedId.toString(), name });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add company" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const db = await connectToDatabase();
    const result = await db
      .collection("companies")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete company" },
      { status: 500 }
    );
  }
}
