import { NextResponse } from "next/server";
import { supabaseServer, supabaseServerKeyName } from "@/lib/supabaseServer";

export async function GET() {
  try {
    // Get env variable names (never expose the actual values!)
    const envVarNames = {
      // Supabase
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
      // Public Supabase
      hasNextPublicSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasNextPublicSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      // Used key name
      usedKeyName: supabaseServerKeyName,
    };

    // Try a quick test query to confirm DB connectivity
    let testQuery: { ok: boolean; error: string | null } = { ok: false, error: null };
    try {
      const { data, error } = await supabaseServer
        .from("tracks")
        .select("count()")
        .limit(1);
      testQuery = {
        ok: !error,
        error: error ? String(error.message || error) : null,
      };
    } catch (err: any) {
      testQuery.error = err?.message || String(err);
    }

    return NextResponse.json({
      envVarNames,
      supabaseTest: testQuery,
      serverTime: new Date().toISOString(),
      note: "This endpoint only shows which env vars are set (not their values) and test DB connectivity."
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
