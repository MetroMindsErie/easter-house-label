"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { MintingSpinner } from "./MintingSpinner";
import { useRouter } from "next/navigation";

type TrackCard = {
  id: number;
  title: string;
  artist: string;
  cover_art_url: string;
  audio_file_url: string;
  price_cents: number | null;
  mint_status: string | null;
  metadata_url?: string | null;
};

export function BuyNow() {
  const { status: authStatus, user } = useAuth();
  const { wallet } = useWallet();
  const [tracks, setTracks] = useState<TrackCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [buyingId, setBuyingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [serverListingsCount, setServerListingsCount] = useState<number | null>(null);
  const [minting, setMinting] = useState(false); // State for the minting spinner
  const [isMockMode, setIsMockMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseBrowser
          .from("tracks")
          .select("*")
          .not("price_cents", "is", null)
          .in("mint_status", ["minted", "listed"])
          .order("id", { ascending: false });

        if (error) throw error;
        if (mounted) setTracks(data || []);
      } catch (err: any) {
        console.error("Failed to fetch listings (client):", err);
        if (mounted) setMessage("Failed to load listings (client)");
      } finally {
        if (mounted) setLoading(false);
      }

      // diagnostic: fetch what the server sees
      try {
        const resp = await fetch("/api/listings");
        const json = await resp.json();
        if (resp.ok && json.ok) {
          setServerListingsCount((json.listings || []).length);
          // if client sees listings but server sees zero -> show clear hint
          if ((tracks?.length || 0) > 0 && (json.listings || []).length === 0) {
            setMessage(
              "Server sees 0 listings while your browser sees listings. Check SUPABASE_SERVICE_KEY / SUPABASE_URL and Row Level Security (RLS). Visit /api/supabase-status for more details."
            );
          }
          console.log("server listings (diagnostic):", json.listings || []);
        } else {
          console.warn("server listings error:", json);
        }
      } catch (err) {
        console.warn("failed to fetch server listings for diagnostic:", err);
      }
    })();

    // Check if we're in mock mode
    fetch('/api/check-env')
      .then(res => res.json())
      .then(data => {
        setIsMockMode(data?.environment?.MOCK_MINT_ENABLED || false);
      })
      .catch(err => console.error('Failed to check environment:', err));

    return () => {
      mounted = false;
    };
  }, []);

  async function handleBuy(trackId: number) {
    setMessage(null);
    if (authStatus !== "logged-in" || !user) {
      setMessage("Please sign in to purchase.");
      return;
    }
    
    const buyerWallet =
      (wallet && (wallet as any)?.address) || (user as any)?.crossmint_wallet_id;

    if (!buyerWallet) {
      setMessage(
        "Please create or open your Crossmint wallet first. After signing in, open the Crossmint Wallet modal to generate/attach your wallet address."
      );
      return;
    }

    // Get user ID from the auth user object
    const userId = (user as any)?.id;
    console.log("User ID for NFT purchase:", userId);
    console.log("Buyer wallet for NFT purchase:", buyerWallet);

    setBuyingId(trackId);
    setMinting(true); // Show the minting spinner while processing
    
    try {
      const resp = await fetch("/api/purchase-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          trackId, 
          buyerWallet,
          userId, // Send the user ID to associate with the NFT
        }),
      });

      const text = await resp.text();
      let jsonBody: any = null;
      try {
        jsonBody = text ? JSON.parse(text) : null;
      } catch {
        jsonBody = text;
      }

      if (!resp.ok) {
        // Provide HTTP status + server JSON/body to aid debugging
        console.error("purchase failed:", resp.status, jsonBody);
        if (jsonBody?.available) {
          setMessage(
            `Purchase failed: ${jsonBody.error || "unknown"}. Available listings: ${jsonBody.available
              .map((a: any) => `${a.id}("${a.title}") $${(a.price_cents/100).toFixed(2)}`)
              .join(", ")}`
          );
        } else {
          setMessage(`Purchase failed: ${jsonBody?.error || String(jsonBody) || resp.statusText}`);
        }
        return;
      }

      // Success - show success message and redirect to dashboard
      console.log("Purchase successful! Response:", jsonBody);
      setMessage(`Purchase successful! NFT minted with transaction ID: ${jsonBody.transactionId}. Redirecting to your dashboard...`);
      
      // Clear the localStorage cache for the dashboard to ensure fresh NFT data
      try {
        if (typeof window !== 'undefined') {
          const dashboardKey = `crossmint_dashboard_wallet_synced:${userId}:${buyerWallet}`;
          sessionStorage.removeItem(dashboardKey);
        }
      } catch (e) {
        console.warn("Error clearing session storage:", e);
      }
      
      // Redirect to dashboard after a brief delay to show the success message
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (err: any) {
      console.error("purchase error:", err);
      setMessage(err?.message || "Purchase failed");
    } finally {
      setBuyingId(null);
      setMinting(false); // Hide the spinner when finished
    }
  }

  if (loading) return <p>Loading listings...</p>;
  if (tracks.length === 0) return <p>No tracks listed for sale at the moment.</p>;

  return (
    <div className="space-y-4">
      <MintingSpinner isVisible={minting} />
      
      {isMockMode && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          <p className="text-amber-800 text-sm">
            <strong>Development Mode:</strong> Using mock minting (CROSSMINT_MOCK_MINT=true)
          </p>
          <ul className="list-disc pl-5 mt-1 text-xs text-amber-700">
            <li>No actual payment will be processed</li>
            <li>NFTs are created in your database but won't appear in Crossmint</li>
            <li>In production, this would deduct USDXM from user's wallet balance</li>
          </ul>
        </div>
      )}
      
      {message && <p className="text-sm mb-2">{message}</p>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tracks.map((t) => (
          <div key={t.id} className="border rounded p-4">
            {/* show the id to help debug which id to buy */}
            <div className="text-xs text-gray-500 mb-1">Listing id: {t.id}</div>
            <img
              src={t.cover_art_url}
              alt={t.title}
              className="w-full h-44 object-cover mb-2 rounded"
            />
            <h3 className="font-semibold">{t.title}</h3>
            <p className="text-sm text-gray-600">{t.artist}</p>
            <p className="mt-2 text-sm">
              Price:{" "}
              {t.price_cents != null ? `$${(t.price_cents / 100).toFixed(2)}` : "Not for sale"}
            </p>
            {t.audio_file_url && (
              <audio controls src={t.audio_file_url} className="w-full mt-2" />
            )}
            <div className="mt-3">
              <button
                className="btn"
                onClick={() => handleBuy(t.id)}
                disabled={buyingId === t.id}
              >
                {buyingId === t.id ? "Processing..." : `Buy & Mint to My Wallet (${t.price_cents != null ? `$${(t.price_cents / 100).toFixed(2)}` : "Free"})`}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isMockMode ? (
                "Development mode: No actual payment will be processed."
              ) : (
                "This will deduct the purchase amount from your Crossmint USDXM balance."
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}