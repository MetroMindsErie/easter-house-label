import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("tracks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("track route error:", error);
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, track: data });
  } catch (err: any) {
    console.error("track route unexpected error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
