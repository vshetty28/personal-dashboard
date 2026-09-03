import { NextResponse } from "next/server";
import { getTodaysTickTickTasks } from "@/lib/ticktick";

export async function GET() {
  try {
    const tasks = await getTodaysTickTickTasks();
    if (tasks === null) {
      return NextResponse.json({ connected: false, tasks: [] });
    }
    return NextResponse.json({ connected: true, tasks });
  } catch (err) {
    console.error("Failed to fetch tasks", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
