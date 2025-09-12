import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/api/actions";

// GET - Fetch all unique categories from services
export async function GET(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    
    // Get all unique categories from the customServices collection
    const categories = await db
      .collection("customServices")
      .distinct("category", { isActive: true });

    // Sort categories alphabetically
    const sortedCategories = categories
      .filter(cat => cat) // Remove null/undefined values
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    return NextResponse.json(sortedCategories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}