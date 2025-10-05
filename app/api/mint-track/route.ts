import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type MintRequestBody = {
  title: string;
  artist: string;
  album?: string;
  coverArtUrl: string;
  audioFileUrl: string;
  releaseDate?: string;
  walletAddress: string;
  priceCents?: number | null;
};

export async function POST(request: Request) {
  try {
    const body: MintRequestBody = await request.json();

    // basic validation
    if (
      !body.title ||
      !body.artist ||
      !body.coverArtUrl ||
      !body.audioFileUrl ||
      !body.walletAddress
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert pending track record (capture price if provided)
    const insertResp = await supabaseServer
      .from("tracks")
      .insert({
        title: body.title,
        artist: body.artist,
        album: body.album || null,
        cover_art_url: body.coverArtUrl,
        audio_file_url: body.audioFileUrl,
        release_date: body.releaseDate || null,
        mint_status: "pending",
        owner_wallet_address: null,
        price_cents: body.priceCents ?? null,
      })
      .select("id")
      .single();

    if (insertResp.error || !insertResp.data?.id) {
      throw insertResp.error || new Error("Failed to create track record");
    }

    const trackId = insertResp.data.id;

    // create metadata JSON
    const metadata = {
      name: body.title,
      description: `${body.title} by ${body.artist}`,
      attributes: {
        artist: body.artist,
        album: body.album || null,
        releaseDate: body.releaseDate || null,
      },
      image: body.coverArtUrl,
      animation_url: body.audioFileUrl,
      external_url: null,
      properties: {},
      trackId,
    };

    // Upload metadata JSON to Supabase Storage (bucket: metadata)
    const metadataKey = `metadata/track-${trackId}.json`;
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));

    const uploadResp = await supabaseServer.storage
      .from("metadata")
      .upload(metadataKey, metadataBuffer, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadResp.error) {
      throw uploadResp.error;
    }

    const { data } = supabaseServer.storage
      .from("metadata")
      .getPublicUrl(metadataKey);

    const metadataUrl = (data as any)?.publicUrl;

    // Update the track row with metadata_url before minting
    const metaUpdate = await supabaseServer
      .from("tracks")
      .update({ metadata_url: metadataUrl })
      .eq("id", trackId);
    if (metaUpdate.error) {
      console.warn("Failed to update metadata_url:", metaUpdate.error);
    }

    // Call Crossmint mint API (server-side) - adjust endpoint/payload if needed for your Crossmint plan
    const crossmintApiKey = process.env.NEXT_PUBLIC_CROSSMINT_API_KEY || "";

    const crossmintEndpoint =
      process.env.CROSSMINT_MINT_ENDPOINT ||
      "https://api.crossmint.com/v1/mint"; // adjust if needed

    const mintPayload = {
      to: body.walletAddress,
      metadata: metadataUrl,
      // if you have optional pricing/collection fields, add them here
    };

    const crossmintResp = await fetch(crossmintEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${crossmintApiKey}`,
      },
      body: JSON.stringify(mintPayload),
    });

    if (!crossmintResp.ok) {
      const text = await crossmintResp.text();
      // update DB to reflect mint error
      await supabaseServer.from("tracks").update({ mint_status: "error" }).eq("id", trackId);
      throw new Error(
        `Crossmint mint failed: ${crossmintResp.status} ${text}`
      );
    }

    const crossmintData = await crossmintResp.json();

    // Expect crossmintData to contain a transactionId (adjust as your API returns)
    const transactionId = crossmintData?.transactionId || crossmintData?.txId || null;

    // Update the track row with mint result and owner/sale status
    const updateResp = await supabaseServer
      .from("tracks")
      .update({
        mint_status: transactionId ? "minted" : "error",
        owner_wallet_address: body.walletAddress,
        transaction_id: transactionId,
        // if price was provided, keep price_cents so buyers can purchase
      })
      .eq("id", trackId);

    if (updateResp.error) {
      throw updateResp.error;
    }

    return NextResponse.json({
      ok: true,
      trackId,
      metadataUrl,
      transactionId,
      crossmintData,
    });
  } catch (err: any) {
    console.error("mint-track error:", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
