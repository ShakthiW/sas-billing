import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { CustomPart } from "@/types/services-parts";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@clerk/nextjs/server";

// GET - Fetch all parts or search parts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const brand = searchParams.get("brand");
    const category = searchParams.get("category");
    const isActive = searchParams.get("active");

    const db = await connectToDatabase();
    
    // Build filter
    const filter: any = {};
    if (isActive !== null) {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true; // By default, only show active parts
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { partNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    if (brand) {
      filter.brand = { $regex: brand, $options: "i" };
    }
    
    if (category) {
      filter.category = category;
    }

    const parts = await db
      .collection("customParts")
      .find(filter)
      .sort({ name: 1, brand: 1 })
      .toArray();

    return NextResponse.json(parts);
  } catch (error) {
    console.error("Failed to fetch parts:", error);
    return NextResponse.json(
      { error: "Failed to fetch parts" },
      { status: 500 }
    );
  }
}

// POST - Create a new part
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      brand, 
      category, 
      partNumber, 
      description, 
      defaultPrice, 
      stockQuantity,
      minStockLevel,
      tags 
    } = body;

    if (!name || !brand) {
      return NextResponse.json(
        { error: "Part name and brand are required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Check if part with same name and brand already exists
    const existing = await db.collection("customParts").findOne({
      name: { $regex: `^${name}$`, $options: "i" },
      brand: { $regex: `^${brand}$`, $options: "i" }
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "Part with this name and brand already exists" },
        { status: 409 }
      );
    }

    const newPart: CustomPart = {
      partId: uuidv4(),
      name,
      brand,
      category,
      partNumber,
      description,
      defaultPrice,
      stockQuantity: stockQuantity || 0,
      minStockLevel: minStockLevel || 0,
      tags: tags || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await db.collection("customParts").insertOne(newPart as any);

    return NextResponse.json({
      success: true,
      partId: newPart.partId,
      _id: result.insertedId
    });
  } catch (error) {
    console.error("Failed to create part:", error);
    return NextResponse.json(
      { error: "Failed to create part" },
      { status: 500 }
    );
  }
}

// PUT - Update a part
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { partId, ...updateData } = body;

    if (!partId) {
      return NextResponse.json(
        { error: "Part ID is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // If name and brand are being updated, check for duplicates
    if (updateData.name || updateData.brand) {
      const currentPart = await db.collection("customParts").findOne({ partId });
      if (!currentPart) {
        return NextResponse.json(
          { error: "Part not found" },
          { status: 404 }
        );
      }

      const checkName = updateData.name || currentPart.name;
      const checkBrand = updateData.brand || currentPart.brand;
      
      const existing = await db.collection("customParts").findOne({
        name: { $regex: `^${checkName}$`, $options: "i" },
        brand: { $regex: `^${checkBrand}$`, $options: "i" },
        partId: { $ne: partId }
      });
      
      if (existing) {
        return NextResponse.json(
          { error: "Part with this name and brand already exists" },
          { status: 409 }
        );
      }
    }

    const result = await db.collection("customParts").updateOne(
      { partId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Part not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error("Failed to update part:", error);
    return NextResponse.json(
      { error: "Failed to update part" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a part (set isActive to false)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const partId = searchParams.get("partId");

    if (!partId) {
      return NextResponse.json(
        { error: "Part ID is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    const result = await db.collection("customParts").updateOne(
      { partId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Part not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Failed to delete part:", error);
    return NextResponse.json(
      { error: "Failed to delete part" },
      { status: 500 }
    );
  }
}