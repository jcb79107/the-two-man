import { NextResponse } from "next/server";
import { searchCourseCatalog } from "@/lib/server/course-catalog";
import { assertRequestAllowed } from "@/lib/server/request-throttle";

export async function GET(request: Request) {
  await assertRequestAllowed({
    key: "course-search",
    limit: 30,
    windowSeconds: 60 * 5,
    message: "Too many course searches. Please wait a few minutes and try again."
  });

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
