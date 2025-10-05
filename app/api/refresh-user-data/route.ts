import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: Request) {
  try {
    const { userId, walletAddress } = await request.json();
    
    if (!userId || !walletAddress) {
      return NextResponse.json({ 
        success: false,
        error: "Missing userId or walletAddress"
      }, { status: 400 });
    }
    
    console.log(`[refresh-user-data] Refreshing data for user: ${userId}, wallet: ${walletAddress}`);
    
    // 1. Ensure user exists and has wallet address
    const { data: userData, error: userError } = await supabaseServer
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (userError) {
      console.error("[refresh-user-data] Error fetching user:", userError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch user data"
      }, { status: 500 });
    }
    
    // 2. Update user's wallet address if needed
    if (!userData.wallet_address || userData.wallet_address !== walletAddress) {
      console.log(`[refresh-user-data] Updating wallet address for user ${userId}`);
      
      const { error: updateError } = await supabaseServer
        .from("users")
        .update({ wallet_address: walletAddress })
        .eq("id", userId);
        
      if (updateError) {
        console.error("[refresh-user-data] Failed to update wallet address:", updateError);
      }
    }
    
    // 3. Check for NFTs that match the wallet but aren't associated with the user
    const { data: orphanedNfts, error: orphanedError } = await supabaseServer
      .from("user_nfts")
      .select("*")
      .eq("wallet_address", walletAddress)
      .is("user_id", null);
      
    if (orphanedError) {
      console.error("[refresh-user-data] Error checking for orphaned NFTs:", orphanedError);
    } else if (orphanedNfts && orphanedNfts.length > 0) {
      console.log(`[refresh-user-data] Found ${orphanedNfts.length} orphaned NFTs to associate with user ${userId}`);
      
      // Update orphaned NFTs to associate them with this user
      const { error: associateError } = await supabaseServer
        .from("user_nfts")
        .update({ user_id: userId })
        .eq("wallet_address", walletAddress)
        .is("user_id", null);
        
      if (associateError) {
        console.error("[refresh-user-data] Error associating orphaned NFTs:", associateError);
      } else {
        console.log(`[refresh-user-data] Successfully associated ${orphanedNfts.length} NFTs with user ${userId}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: "User data refreshed successfully",
      updatedWallet: !userData.wallet_address || userData.wallet_address !== walletAddress,
      orphanedNftsCount: orphanedNfts?.length || 0
    });
  } catch (err: any) {
    console.error("[refresh-user-data] Unhandled error:", err);
    return NextResponse.json({
      success: false,
      error: err.message || String(err)
    }, { status: 500 });
  }
}
