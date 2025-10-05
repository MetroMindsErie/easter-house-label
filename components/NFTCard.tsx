import React, { useState, useEffect } from 'react';
import Image from 'next/image';

type NFTCardProps = {
  id: number;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  editionNumber: number;
  purchaseDate: string;
  transactionId: string;
  walletAddress: string;
};

export function NFTCard({
  id,
  title,
  artist,
  coverUrl,
  audioUrl,
  editionNumber,
  purchaseDate,
  transactionId,
  walletAddress,
}: NFTCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);

  // Check if we're in mock mode
  useEffect(() => {
    fetch('/api/check-env')
      .then(res => res.json())
      .then(data => {
        setIsMockMode(data?.environment?.MOCK_MINT_ENABLED || false);
      })
      .catch(err => console.error('Failed to check environment:', err));
  }, []);

  // Handle missing data gracefully
  const safeTitle = title || "Untitled Track";
  const safeArtist = artist || "Unknown Artist";
  const safeCoverUrl = coverUrl || "/placeholder-cover.jpg";
  const safeAudioUrl = audioUrl || "";
  
  // Only create audio object if URL is available
  const [audio] = useState(() => {
    if (typeof window !== 'undefined' && safeAudioUrl) {
      try {
        return new Audio(safeAudioUrl);
      } catch (e) {
        console.error("Failed to create audio object:", e);
        return null;
      }
    }
    return null;
  });

  const formattedDate = new Date(purchaseDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const togglePlay = () => {
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Clean up audio when component unmounts
  React.useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  const viewInWallet = () => {
    if (isMockMode) {
      alert("In development mode, NFTs are mock-minted and won't appear in your Crossmint wallet. In production, your NFTs will be visible in your wallet.");
      return;
    }
    
    // Open in Crossmint wallet with correct URL format
    // Note: URL format may need adjustment based on exact Crossmint wallet requirements
    const chain = process.env.NEXT_PUBLIC_CHAIN || 'solana';
    const walletUrl = `https://www.crossmint.com/collections/${walletAddress}`;
    window.open(walletUrl, '_blank');
  };

  // Function to download image
  const downloadImage = async () => {
    if (!safeCoverUrl) return;
    
    try {
      setDownloadingImage(true);
      
      const response = await fetch(safeCoverUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Get file extension from URL or default to jpg
      const extension = safeCoverUrl.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `${safeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cover_${editionNumber}.${extension}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setDownloadingImage(false);
    }
  };
  
  // Function to download audio
  const downloadAudio = async () => {
    if (!safeAudioUrl) return;
    
    try {
      setDownloadingAudio(true);
      
      const response = await fetch(safeAudioUrl);
      if (!response.ok) throw new Error('Failed to fetch audio');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Get file extension from URL or default to mp3
      const extension = safeAudioUrl.split('.').pop()?.toLowerCase() || 'mp3';
      const filename = `${safeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_by_${safeArtist.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${editionNumber}.${extension}`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading audio:', error);
      alert('Failed to download audio. Please try again.');
    } finally {
      setDownloadingAudio(false);
    }
  };

  // Only enable play button if audio URL and audio object exist
  const canPlay = !!audio && !!safeAudioUrl;

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="relative">
        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
          <img
            src={safeCoverUrl}
            alt={safeTitle}
            className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLImageElement).src = "/placeholder-cover.jpg";
            }}
          />
        </div>
        <div className="absolute top-2 right-2 bg-purple-800 text-white text-xs font-bold px-2 py-1 rounded-full">
          #{editionNumber || "?"}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-white font-bold truncate">{safeTitle}</h3>
        <p className="text-gray-400 text-sm mb-3">{safeArtist}</p>
        
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">Purchased</p>
            <p className="text-sm text-gray-300">{formattedDate}</p>
          </div>
          
          <button
            onClick={togglePlay}
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              isPlaying ? "bg-green-600" : "bg-purple-600"
            } hover:opacity-90 transition-colors`}
            disabled={!canPlay}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Download buttons */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={downloadImage}
            disabled={downloadingImage || !safeCoverUrl}
            className="flex items-center justify-center py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md font-medium transition-colors duration-300 flex-1"
          >
            {downloadingImage ? (
              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {downloadingImage ? "Downloading..." : "Download Art"}
          </button>
          
          <button
            onClick={downloadAudio}
            disabled={downloadingAudio || !safeAudioUrl}
            className="flex items-center justify-center py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md font-medium transition-colors duration-300 flex-1"
          >
            {downloadingAudio ? (
              <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            )}
            {downloadingAudio ? "Downloading..." : "Download Audio"}
          </button>
        </div>
        
        <button
          onClick={viewInWallet}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 rounded-md font-medium transition-colors duration-300"
        >
          {isMockMode ? "View in Wallet (Mock Mode)" : "View in Wallet"}
        </button>
        
        {isMockMode && (
          <p className="mt-2 text-xs text-amber-400">
            NFTs minted in development mode won't appear in your Crossmint wallet
          </p>
        )}
      </div>
    </div>
  );
}
