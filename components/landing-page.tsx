import { useState, useEffect } from "react";
import { EmbeddedAuthForm } from "@crossmint/client-sdk-react-ui";
import Image from "next/image";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Exclusive Music",
    description:
      "Access limited edition tracks, albums, and mixes from our roster of talented house music artists.",
    iconPath: "/music.svg", // You'll need to add this icon
  },
  {
    title: "Digital Collectibles",
    description:
      "Own unique digital artwork and music NFTs from your favorite Easter House artists and events.",
    iconPath: "/collection.svg", // You'll need to add this icon
  },
  {
    title: "Community Access",
    description:
      "Join exclusive events, virtual listening parties, and connect with other Easter House music fans.",
    iconPath: "/users.svg", // You'll need to add this icon
  },
];

export function LandingPage({ isLoading }: { isLoading: boolean }) {
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    // Trigger feature animations after the page transition completes
    const timer = setTimeout(() => {
      setShowFeatures(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      {/* Left side - Information with background */}
      <div
        className="relative hidden lg:flex flex-col rounded-[20px] justify-center px-18 py-8 m-3 col-span-2"
        style={{
          backgroundImage: `url('/grid-bg.png')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark overlay for better text readability */}
        <div
          className={cn(
            "absolute rounded-[20px] inset-0 bg-black/40 transition-opacity duration-600 ease-out",
            showFeatures ? "opacity-100" : "opacity-0"
          )}
        ></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col gap-12 text-white">
          <div className="flex flex-col gap-4">
            {/* Logo */}
            <div className="mb-4">
              <Image 
                src="/easter-house-logo.png" 
                alt="Easter House Music Group" 
                width={120} 
                height={120}
                className="rounded-full"
              />
            </div>
            
            <h1 className="text-6xl font-bold">Easter House Music Group</h1>
            <p className="text-white/60 text-lg">
              Your gateway to exclusive house music, digital collectibles, and community events.
              Powered by secure Crossmint wallet technology.
            </p>
          </div>

          {/* Features list */}
          <div className="flex flex-col gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`flex items-start gap-5 p-4 backdrop-blur-sm rounded-2xl bg-blue-300/3 border border-white/10 transition-all duration-600 ease-out ${
                  showFeatures
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{
                  transitionDelay: showFeatures ? `${index * 150}ms` : "0ms",
                }}
              >
                <div className="w-10 h-10 border-white/20 border-2 rounded-full flex items-center justify-center self-center flex-shrink-0">
                  <Image
                    className="filter-green w-6"
                    src={feature.iconPath}
                    alt={feature.title}
                    width={20}
                    height={20}
                  />
                </div>
                <div>
                  <h3 className="font-medium text-white">{feature.title}</h3>
                  <p className="text-sm text-white/60">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Attribution to Crossmint */}
          <p className="text-xs text-white/40 mt-4">
            Secure wallet technology provided by Crossmint
          </p>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex items-center justify-center bg-gray-50 px-6 py-12 col-span-1 lg:col-span-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full max-w-md bg-white rounded-3xl border shadow-lg overflow-hidden">
            <div className="p-4 bg-black text-white text-center">
              <h2 className="font-bold">Join Easter House Music Group</h2>
              <p className="text-sm">Sign up or log in to access exclusive content</p>
            </div>
            <EmbeddedAuthForm />
          </div>
        )}
      </div>
    </div>
  );
}