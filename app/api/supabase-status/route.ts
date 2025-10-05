import { NextResponse } from "next/server";
import { supabaseServer, supabaseServerKeyName } from "@/lib/supabaseServer";

export async function GET() {
  try {
    // Perform a minimal test query to surface auth errors (e.g. invalid API key, RLS)
    const { data, error } = await supabaseServer
      .from("tracks")
      .select("id, title, price_cents, mint_status")
      .limit(5);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          usedEnvVar: supabaseServerKeyName || null,
          message: "Supabase query error",
          error: error.message || error,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      ok: true,
      usedEnvVar: supabaseServerKeyName || null,
      sample: data || [],
      note:
        "This endpoint reports which server-side env var name was selected and returns a small sample query. It does NOT reveal secret key values.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        usedEnvVar: supabaseServerKeyName || null,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}