import { NextResponse } from "next/server";
import { supabaseServer, supabaseServerKeyName } from "@/lib/supabaseServer";

export async function GET() {
  try {
    // try server-side query first
    const { data, error } = await supabaseServer
      .from("tracks")
      .select("id, title, artist, price_cents, mint_status, metadata_url, cover_art_url")
      .not("price_cents", "is", null)
      .in("mint_status", ["listed", "minted"])
      .order("id", { ascending: false })
      .limit(200);

    if (!error) {
      return NextResponse.json({
        ok: true,
        source: "server",
        usedEnvVar: supabaseServerKeyName || null,
        listings: data || [],
      });
    }

    // log server error and attempt public anon REST fallback
    const serverErr = (error && (error.message || String(error))) || "unknown server error";
    console.info("listings route server query error, attempting public REST fallback:", serverErr);

    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (publicUrl && anon) {
      try {
        const url = `${publicUrl.replace(/\/$/, "")}/rest/v1/tracks?price_cents=not.is.null&mint_status=in.(listed,minted)&select=id,title,artist,price_cents,mint_status,metadata_url,cover_art_url&order=id.desc&limit=200`;
        const res = await fetch(url, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        });
        if (res.ok) {
          const json = await res.json();
          return NextResponse.json({
            ok: true,
            source: "public-fallback",
            usedEnvVar: supabaseServerKeyName || null,
            serverError: serverErr,
            listings: json,
            note:
              "Returned public anon REST fallback because server-side query failed. Fix server key (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY) to use server-side queries.",
          });
        } else {
          const text = await res.text();
          console.warn("public REST fallback returned non-ok:", res.status, text);
        }
      } catch (e: any) {
        console.warn("public REST fallback error:", e?.message || e);
      }
    }

    // if fallback not available or failed, return server error diagnostics
    return NextResponse.json(
      {
        ok: false,
        source: "server",
        usedEnvVar: supabaseServerKeyName || null,
        error: serverErr,
        note:
          "Server-side query failed and public REST fallback is unavailable or failed. Ensure SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) is set in your server environment (.env.local) and restart the dev server.",
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("listings route unexpected error:", err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
