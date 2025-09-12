import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";

// GET - Fetch all unique brands from parts
export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    
    // Get all unique brands from the customParts collection
    const brands = await db
      .collection("customParts")
      .distinct("brand", { isActive: true });

    // Sort brands alphabetically
    const sortedBrands = brands.sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    return NextResponse.json(sortedBrands);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}