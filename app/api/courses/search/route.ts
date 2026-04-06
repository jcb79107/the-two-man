import { NextResponse } from "next/server";
import { searchCourseCatalog } from "@/lib/server/course-catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const state = searchParams.get("state")?.trim().toUpperCase() ?? "";

  if (!name) {
    return NextResponse.json({ error: "Course name is required." }, { status: 400 });
  }

  try {
    const courses = await searchCourseCatalog({
      name,
      state: state || undefined
    });

    return NextResponse.json({ courses });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search courses."
      },
      { status: 500 }
    );
  }
}
