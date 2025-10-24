import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { PartBrand } from "@/types/services-parts";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@clerk/nextjs/server";

// GET - Fetch all brands from customBrands collection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const isActive = searchParams.get("active");

    const db = await connectToDatabase();

    // Build filter
    const filter: any = {};
    if (isActive !== null) {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true; // By default, only show active brands
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    const brands = await db
      .collection("customBrands")
      .find(filter)
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(brands);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

// POST - Create a new brand
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Check if brand already exists (case-insensitive)
    const existingBrand = await db
      .collection("customBrands")
      .findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });

    if (existingBrand) {
      return NextResponse.json(
        { error: "Brand with this name already exists" },
        { status: 400 }
      );
    }

    const brandId = uuidv4();
    const newBrand: PartBrand = {
      brandId,
      name: name.trim(),
      description: description?.trim() || "",
      isActive: true,
      createdAt: new Date(),
    };

    await db.collection("customBrands").insertOne(newBrand);

    return NextResponse.json(newBrand, { status: 201 });
  } catch (error) {
    console.error("Failed to create brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing brand
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, name, description, isActive } = body;

    if (!brandId || !name || !name.trim()) {
      return NextResponse.json(
        { error: "Brand ID and name are required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Check if brand exists
    const existingBrand = await db
      .collection("customBrands")
      .findOne({ brandId });

    if (!existingBrand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    // Check if another brand with the same name exists (case-insensitive)
    const duplicateBrand = await db
      .collection("customBrands")
      .findOne({
        brandId: { $ne: brandId },
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") }
      });

    if (duplicateBrand) {
      return NextResponse.json(
        { error: "Brand with this name already exists" },
        { status: 400 }
      );
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || "",
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date(),
    };

    await db
      .collection("customBrands")
      .updateOne({ brandId }, { $set: updateData });

    const updatedBrand = await db
      .collection("customBrands")
      .findOne({ brandId });

    return NextResponse.json(updatedBrand);
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a brand
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // Check if brand exists
    const existingBrand = await db
      .collection("customBrands")
      .findOne({ brandId });

    if (!existingBrand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    // Check if brand is used by any active parts
    const partsUsingBrand = await db
      .collection("customParts")
      .countDocuments({
        brand: existingBrand.name,
        isActive: true
      });

    if (partsUsingBrand > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete brand. It is used by ${partsUsingBrand} active part(s). Please deactivate or update the parts first.`
        },
        { status: 400 }
      );
    }

    await db.collection("customBrands").deleteOne({ brandId });

    return NextResponse.json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 }
    );
  }
}