import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";
import { CustomService } from "@/types/services-parts";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@clerk/nextjs/server";

// GET - Fetch all services or search services
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const isActive = searchParams.get("active");

    const db = await connectToDatabase();
    
    // Build filter
    const filter: any = {};
    if (isActive !== null) {
      filter.isActive = isActive === "true";
    } else {
      filter.isActive = true; // By default, only show active services
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }

    const services = await db
      .collection("customServices")
      .find(filter)
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(services);
  } catch (error) {
    console.error("Failed to fetch services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

// POST - Create a new service
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
    const { name, description, category, estimatedDuration, defaultPrice, tags } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Service name is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // Check if service with same name already exists
    const existing = await db.collection("customServices").findOne({
      name: { $regex: `^${name}$`, $options: "i" }
    });
    
    if (existing) {
      return NextResponse.json(
        { error: "Service with this name already exists" },
        { status: 409 }
      );
    }

    const newService: CustomService = {
      serviceId: uuidv4(),
      name,
      description,
      category,
      estimatedDuration,
      defaultPrice,
      tags: tags || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId
    };

    const result = await db.collection("customServices").insertOne(newService as any);

    return NextResponse.json({
      success: true,
      serviceId: newService.serviceId,
      _id: result.insertedId
    });
  } catch (error) {
    console.error("Failed to create service:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

// PUT - Update a service
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
    const { serviceId, ...updateData } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    // If name is being updated, check for duplicates
    if (updateData.name) {
      const existing = await db.collection("customServices").findOne({
        name: { $regex: `^${updateData.name}$`, $options: "i" },
        serviceId: { $ne: serviceId }
      });
      
      if (existing) {
        return NextResponse.json(
          { error: "Service with this name already exists" },
          { status: 409 }
        );
      }
    }

    const result = await db.collection("customServices").updateOne(
      { serviceId },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      modified: result.modifiedCount
    });
  } catch (error) {
    console.error("Failed to update service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a service (set isActive to false)
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
    const serviceId = searchParams.get("serviceId");

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    
    const result = await db.collection("customServices").updateOne(
      { serviceId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error("Failed to delete service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}