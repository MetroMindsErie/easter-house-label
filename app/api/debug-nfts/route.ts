import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  // Get the wallet address and user ID from the URL query params
  const url = new URL(request.url);
  const wallet = url.searchParams.get("wallet");
  const userId = url.searchParams.get("userId");
  
  try {
    console.log(`[debug-nfts] Fetching NFTs - wallet: ${wallet}, userId: ${userId}`);
    
    // Query 1: Get all NFTs (limited to 50) - this is just for diagnostic purposes
    const { data: allNfts, error: allError } = await supabaseServer
      .from("user_nfts")
      .select("*")
      .limit(50);
      
    // Query 2: Try to get NFTs by user ID first (if provided)
    let userNfts = null;
    let userError = null;
    
    if (userId) {
      console.log(`[debug-nfts] Looking up NFTs by user ID: ${userId}`);
      const result = await supabaseServer
        .from("user_nfts")
        .select("*, track:track_id(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
        
      userNfts = result.data;
      userError = result.error;
      
      if (userError) {
        console.error(`[debug-nfts] Error fetching NFTs by user ID:`, userError);
      } else {
        console.log(`[debug-nfts] Found ${userNfts?.length || 0} NFTs by user ID`);
      }
    }
    
    // Query 3: Get NFTs for specific wallet address if provided
    let walletNfts = null;
    let walletError = null;
    
    if (wallet) {
      console.log(`[debug-nfts] Looking up NFTs by wallet address: ${wallet}`);
      // Use case insensitive search for wallet address
      const result = await supabaseServer
        .from("user_nfts")
        .select("*, track:track_id(*)")
        .ilike("wallet_address", wallet)
        .order("created_at", { ascending: false });
        
      walletNfts = result.data;
      walletError = result.error;
      
      if (walletError) {
        console.error(`[debug-nfts] Error fetching NFTs by wallet:`, walletError);
      } else {
        console.log(`[debug-nfts] Found ${walletNfts?.length || 0} NFTs by wallet address`);
      }
    }
    
    // If no NFTs found by user ID or specific wallet, try a broader case-insensitive search
    if ((!userNfts || userNfts.length === 0) && (!walletNfts || walletNfts.length === 0) && wallet) {
      console.log(`[debug-nfts] No NFTs found, trying broader search for wallet: ${wallet}`);
      
      const { data: broadNfts, error: broadError } = await supabaseServer
        .from("user_nfts")
        .select("*, track:track_id(*)")
        .order("created_at", { ascending: false })
        .limit(50);
        
      if (broadError) {
        console.error(`[debug-nfts] Error in broader search:`, broadError);
      } else {
        console.log(`[debug-nfts] Found ${broadNfts?.length || 0} total NFTs in system`);
        
        // Find NFTs with similar wallet addresses (case insensitive)
        const filteredNfts = broadNfts?.filter(nft => 
          nft.wallet_address && 
          nft.wallet_address.toLowerCase() === wallet.toLowerCase()
        );
        
        if (filteredNfts && filteredNfts.length > 0) {
          console.log(`[debug-nfts] Found ${filteredNfts.length} NFTs with case-insensitive wallet match`);
          walletNfts = filteredNfts;
        }
      }
    }

    // Query 4: Count all NFTs for statistics
    const { count, error: countError } = await supabaseServer
      .from("user_nfts")
      .select("*", { count: "exact", head: true });
      
    // Return either user NFTs or wallet NFTs, preferring user NFTs if available
    const resultNfts = userNfts?.length ? userNfts : (walletNfts || []);
    
    console.log(`[debug-nfts] Returning ${resultNfts.length} NFTs`);
    
    return NextResponse.json({
      ok: true,
      totalCount: count,
      countError: countError?.message,
      nftsFound: allNfts?.length || 0,
      allNftsError: allError?.message,
      userId: userId || null,
      userNftsFound: userNfts?.length || 0,
      userError: userError?.message,
      walletAddress: wallet || null,
      walletNftsFound: walletNfts?.length || 0,
      walletError: walletError?.message,
      walletNftsSample: resultNfts
    });
  } catch (err: any) {
    console.error("[debug-nfts] Unhandled error:", err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
