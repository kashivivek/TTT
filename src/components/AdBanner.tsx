"use client";

interface AdBannerProps {
  className?: string;
}

export default function AdBanner({ className = "" }: AdBannerProps) {
  const adClient = process.env.NEXT_PUBLIC_ADSENSE_ID;

  if (adClient) {
    return (
      <div className={`ad-container my-4 ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={adClient}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // Placeholder when no ad account is configured
  return (
    <div
      className={`bg-card-surface/40 rounded-xl border border-dashed border-gray-700
                  flex items-center justify-center text-text-muted text-xs py-4 my-4 ${className}`}
    >
      Sponsored · Ad space available
    </div>
  );
}
