import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    // Query the database for total minted NFTs
    const { data: mintedData, error: mintedError } = await supabaseServer
      .from("user_nfts")
      .select("count", { count: "exact", head: true });

    if (mintedError) {
      throw mintedError;
    }

    // Get the total supply from configuration or tracks table
    const { data: supplyData, error: supplyError } = await supabaseServer
      .from("tracks")
      .select("total_supply")
      .limit(1)
      .single();

    if (supplyError && !supplyData) {
      console.warn("Could not fetch total supply:", supplyError);
    }

    // Return the statistics
    return NextResponse.json({
      ok: true,
      minted: mintedData?.[0]?.count || 0,
      totalSupply: supplyData?.total_supply || 10000,
      // For a real implementation, you might want to include additional stats:
      // uniqueOwners, averagePrice, etc.
    });
  } catch (err: any) {
    console.error("Error fetching minting stats:", err);
    return NextResponse.json(
      { 
        ok: false, 
        error: err?.message || String(err),
        minted: 0,
        totalSupply: 10000
      }, 
      { status: 500 }
    );
  }
}
