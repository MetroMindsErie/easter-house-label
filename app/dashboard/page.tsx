"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { NFTCard } from "@/components/NFTCard";
import Link from "next/link";

// Global session storage key
const DASHBOARD_SESSION_STORAGE_KEY = "crossmint_dashboard_wallet_synced";

export default function UserDashboardPage() {
  const { status: authStatus, user } = useAuth();
  const { wallet } = useWallet();
  const [nfts, setNfts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mintStats, setMintStats] = useState({ minted: 0, total: 10000 });
  const [error, setError] = useState<string | null>(null);
  const [walletSynced, setWalletSynced] = useState(false);
  const syncAttemptMade = useRef(false);
  
  // Get user info
  const userId = (user as any)?.id;
  const email = (user as any)?.email;
  const walletAddress = (user as any)?.wallet_address || wallet?.address;
  
  // Check if we've already synced this session
  useEffect(() => {
    if (typeof window !== "undefined" && userId && walletAddress) {
      const key = `${DASHBOARD_SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
      const alreadySynced = sessionStorage.getItem(key);
      if (alreadySynced === "true") {
        setWalletSynced(true);
      }
    }
  }, [userId, walletAddress]);
  
  // Sync user wallet data once per session
  useEffect(() => {
    // Skip if already synced, already attempted, or missing data
    if (walletSynced || syncAttemptMade.current || !userId || !email || !walletAddress) {
      return;
    }
    
    // Mark that we've attempted sync
    syncAttemptMade.current = true;

    const syncUserData = async () => {
      console.log("Dashboard page: Starting user sync...");
      try {
        // Call auth-sync endpoint
        const response = await fetch("/api/auth-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            email,
            walletAddress,
            crossmintWalletId: walletAddress
          }),
        });
        
        const result = await response.json();
        console.log("Dashboard page: Auth sync result:", result);
        
        if (response.ok && result.success) {
          // Mark as synced in session storage
          if (typeof window !== "undefined") {
            const key = `${DASHBOARD_SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
            sessionStorage.setItem(key, "true");
            setWalletSynced(true);
          }
        }
      } catch (error) {
        console.error("Dashboard page: Error syncing user data:", error);
      }
    };

    // Delay execution
    const timeout = setTimeout(syncUserData, 1000);
    return () => clearTimeout(timeout);
  }, [userId, email, walletAddress, walletSynced]);
  
  // Load NFTs - this can run on every render since it doesn't make state-changing API calls
  useEffect(() => {
    if (authStatus !== "logged-in") return;
    
    let mounted = true;
    setLoading(true);
    setError(null);
    
    console.log("Dashboard - User ID:", userId);
    console.log("Dashboard - User wallet address:", walletAddress);
    
    // Use direct fetch instead of Supabase client to avoid potential RLS issues
    const fetchNFTs = async () => {
      try {
        // First try fetching from our debug API endpoint which bypasses client-side restrictions
        const resp = await fetch(`/api/debug-nfts?wallet=${encodeURIComponent(walletAddress || '')}&userId=${encodeURIComponent(userId || '')}`);
        const data = await resp.json();
        
        if (!resp.ok) {
          throw new Error(data?.error || "Failed to fetch NFTs");
        }
        
        console.log("Dashboard - NFTs API response:", data);
        
        if (data?.walletNftsSample && data.walletNftsSample.length > 0) {
          // We have NFTs from the server - use these
          if (mounted) {
            setNfts(data.walletNftsSample);
            console.log(`Successfully loaded ${data.walletNftsSample.length} NFTs from debug endpoint`);
            setLoading(false);
            return;
          }
        } else {
          console.log("No NFTs found from debug endpoint, trying direct queries...");
          
          // Try to query by user ID first (if available)
          if (userId) {
            try {
              const { data: userNftData, error: userNftError } = await supabaseBrowser
                .from("user_nfts")
                .select(`
                  *,
                  track:track_id(
                    title, artist, cover_art_url, audio_file_url
                  )
                `)
                .eq("user_id", userId);
                
              if (!userNftError && userNftData && userNftData.length > 0) {
                if (mounted) {
                  console.log("Found NFTs by user ID:", userNftData.length);
                  setNfts(userNftData);
                  setLoading(false);
                  return;
                }
              }
            } catch (err) {
              console.warn("Error querying NFTs by user ID:", err);
            }
          }
          
          // Fallback to wallet address query if user ID query returned no results
          if (walletAddress) {
            try {
              const { data: nftData, error: nftError } = await supabaseBrowser
                .from("user_nfts")
                .select(`
                  *,
                  track:track_id(
                    title, artist, cover_art_url, audio_file_url
                  )
                `)
                .ilike("wallet_address", walletAddress);
                
              if (nftError) {
                throw nftError;
              }
              
              if (mounted) {
                console.log("Client-side NFT query by wallet:", nftData?.length || 0);
                setNfts(nftData || []);
              }
            } catch (err) {
              console.warn("Error querying NFTs by wallet:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching NFTs:", err);
        if (mounted) {
          setError(`Failed to fetch NFTs: ${err instanceof Error ? err.message : String(err)}`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    // Fetch NFTs if we have either a user ID or wallet address
    if (userId || walletAddress) {
      fetchNFTs();
    } else {
      console.warn("No user ID or wallet address found - cannot fetch NFTs");
      setLoading(false);
    }
    
    // Also fetch minting stats
    (async () => {
      try {
        // Get real minting stats from a dedicated API endpoint instead of direct DB query
        const statsResponse = await fetch('/api/mint-stats');
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch minting stats');
        }
        
        const statsData = await statsResponse.json();
        
        if (statsData && mounted) {
          setMintStats({
            minted: statsData.minted || 0,
            total: statsData.totalSupply || 10000,
          });
        }
      } catch (err) {
        console.error("Failed to fetch minting stats:", err);
        // Fallback to defaults if there's an error
        if (mounted) {
          setMintStats({
            minted: 0,
            total: 10000
          });
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
  }, [authStatus, userId, walletAddress]);

  if (authStatus !== "logged-in") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Sign in to view your NFT collection</h1>
          <p className="text-gray-400">You need to be logged in to see your NFTs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              Your NFT Collection
            </h1>
            <p className="text-gray-400 mt-1">
              Manage and enjoy your music NFTs
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 bg-gray-800 rounded-lg px-4 py-2 border border-gray-700">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse mr-2"></div>
              <p className="text-sm text-gray-300">
                <span className="font-bold text-white">{mintStats.minted.toLocaleString()}</span>
                <span className="mx-1">/</span>
                <span>{mintStats.total.toLocaleString()} NFTs minted</span>
              </p>
            </div>
          </div>
        </div>

        {/* Show wallet address for debugging */}
        {walletAddress && (
          <div className="mb-4 p-2 text-xs bg-gray-800 rounded overflow-hidden">
            <p className="text-gray-400">Wallet: {walletAddress}</p>
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="text-center py-16 bg-gray-800 rounded-xl border border-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <h2 className="mt-4 text-xl font-bold">No NFTs yet</h2>
            <p className="mt-2 text-gray-400">Go mint your first track!</p>
            <Link 
              href="/mint"
              className="mt-6 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              Browse Music NFTs
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nfts.map((nft) => (
              <NFTCard 
                key={nft.id}
                id={nft.id}
                title={nft.track?.title || "Unknown Track"}
                artist={nft.track?.artist || "Unknown Artist"}
                coverUrl={nft.track?.cover_art_url || ""}
                audioUrl={nft.track?.audio_file_url || ""}
                editionNumber={nft.edition_number || 1}
                purchaseDate={nft.created_at || new Date().toISOString()}
                transactionId={nft.transaction_id || ""}
                walletAddress={nft.wallet_address || ""}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
