"use client";

import Link from "next/link";
import { BuyNow } from "./BuyNow";
import { useAuth } from "@crossmint/client-sdk-react-ui";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import Image from "next/image";
import { TransferFunds } from "./transfer";
import { Activity } from "./activity";
import { Footer } from "./footer";
import { LogoutButton } from "./logout";
import { WalletBalance } from "./balance";

// Global session storage mechanism
const SESSION_STORAGE_KEY = "crossmint_wallet_synced";

export function Dashboard({ isLoading = false }) {
  const { user } = useAuth();
  const { wallet } = useWallet();
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [walletSynced, setWalletSynced] = useState(false);
  const initialSyncAttemptMade = useRef(false);

  const walletAddress = wallet?.address;
  const userId = (user as any)?.id;
  const email = (user as any)?.email;

  // Run ONCE on component mount to check if we've already synced this wallet
  useEffect(() => {
    // Check browser session storage for this wallet+user combination
    if (typeof window !== "undefined" && userId && walletAddress) {
      const key = `${SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
      const alreadySynced = sessionStorage.getItem(key);
      if (alreadySynced === "true") {
        console.log("Wallet already synced this session, skipping sync");
        setWalletSynced(true);
      }
    }
  }, [userId, walletAddress]);

  // Save wallet information to database when available - only once per session
  useEffect(() => {
    // Skip if we've already synced or attempted sync, or if missing required data
    if (walletSynced || initialSyncAttemptMade.current || !userId || !email || !walletAddress) {
      return;
    }

    // Mark that we've attempted sync to prevent multiple attempts
    initialSyncAttemptMade.current = true;
    
    const syncWallet = async () => {
      console.log("Dashboard: Starting wallet sync...");
      try {
        // Call auth-sync endpoint to ensure user exists and has wallet
        const response = await fetch("/api/auth-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: userId,
            email: email,
            walletAddress,
            crossmintWalletId: walletAddress // Use wallet address as crossmint ID
          }),
        });

        const result = await response.json();
        console.log("Auth sync result:", result);
        
        if (response.ok && result.success) {
          // Mark as synced in session storage
          if (typeof window !== "undefined") {
            const key = `${SESSION_STORAGE_KEY}:${userId}:${walletAddress}`;
            sessionStorage.setItem(key, "true");
            setWalletSynced(true);
          }
        }
      } catch (error) {
        console.error("Error syncing wallet:", error);
      }
    };

    // Use setTimeout to prevent immediate execution and potential race conditions
    const timeout = setTimeout(syncWallet, 1000);
    return () => clearTimeout(timeout);
  }, [userId, email, walletAddress, walletSynced]);

  const handleCopyAddress = async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white content-center">
      <div className="w-full max-w-7xl mx-auto px-4 py-6 sm:pt-8">
        {/* Logo and branding section */}
        <div className="flex flex-col mb-6 max-sm:items-center">
          <div className="flex items-center justify-between w-full">
            {/* Updated Easter House Music Group Logo with proper styling */}
            <div className="relative w-[220px] h-[100px]">
              <Image
                src="/easter-house-logo.png" 
                alt="Easter House Music Group"
                priority
                fill
                style={{
                  objectFit: 'contain',
                }}
                className="rounded-full"
              />
            </div>
            
            {/* Small Crossmint logo for authenticity */}
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Powered by</span>
              <Image
                src="/crossmint.svg"
                alt="Crossmint"
                width={80}
                height={30}
              />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-2 text-indigo-900">Music NFT Dashboard</h1>
          <p className="text-indigo-600 text-sm">
            Mint, collect, and trade exclusive Easter House Music Group tracks
          </p>
        </div>

        {/* Dashboard Header */}
        <div className="flex flex-col gap-4 bg-white rounded-2xl border border-indigo-100 shadow-md p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Image
                src="/music.png"
                alt="Music"
                width={24}
                height={24}
                className="mr-2"
              />
              <h2 className="text-xl font-semibold text-indigo-900">Your Music Collection</h2>
            </div>
            <LogoutButton />
          </div>

          {/* Show loading spinner when loading from mint page */}
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-indigo-600 font-medium">Refreshing your collection...</p>
              </div>
            </div>
          ) : (
            /* Main Dashboard Grid */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* USDXM Balance & Wallet Details Column */}
              <div className="flex flex-col gap-6">
                {/* USDXM Balance Section */}
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <WalletBalance />
                </div>

                {/* Wallet Details Section */}
                <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold mb-4 text-indigo-800">Artist Wallet</h3>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-sm font-medium text-indigo-500">
                        Wallet Address
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-900 overflow-auto">
                          {walletAddress
                            ? `${walletAddress.slice(
                                0,
                                6
                              )}...${walletAddress.slice(-6)}`
                            : ""}
                        </span>
                        <button
                          onClick={handleCopyAddress}
                          className="text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          {copiedAddress ? (
                            <Image
                              src="/circle-check-big.svg"
                              alt="Copied"
                              width={16}
                              height={16}
                            />
                          ) : (
                            <Image
                              src="/copy.svg"
                              alt="Copy"
                              width={16}
                              height={16}
                            />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-sm font-medium text-indigo-500">
                        Artist
                      </span>
                      <span className="text-sm text-gray-900 overflow-auto">
                        {wallet?.owner?.replace(/^[^:]*:/, "") || "Easter House Artist"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <span className="text-sm font-medium text-indigo-500">
                        Network
                      </span>
                      <span className="text-sm text-gray-900 capitalize text-nowrap overflow-auto">
                        {wallet?.chain}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <TransferFunds />
              <Activity />
            </div>
          )}
        </div>
        
        {/* New music releases section */}
        <div className="mt-8 bg-white rounded-2xl border border-indigo-100 shadow-md p-6">
          <h2 className="text-xl font-semibold text-indigo-900 mb-4">Latest Music NFT Drops</h2>
          <p className="text-gray-600 mb-6">Check out the latest exclusive Easter House Music releases available for minting</p>
          
          <div className="flex justify-center items-center">
            <div className="text-center p-8 text-indigo-500">
              <p>New music drops coming soon</p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}