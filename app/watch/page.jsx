import WatchClient from "./WatchClient";
import config from "@/config.json";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const videoSlug = resolvedSearchParams.v;

  if (!videoSlug) {
    return {
      title: "Watch",
    };
  }

  try {
    // Fetch video data with no-store to ensure fresh data
    const response = await fetch(`${config.url}/api/content/${videoSlug}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GoonChanBot/1.0; +https://goonchan.org)',
        'Accept': 'application/json'
      }
    });
    const data = await response.json();

    if (data.success && data.content) {
      const video = data.content;
      const title = video.title;
      const description = `Watch "${title}" on GoonChan. a playful place where you can watch, chat, and vibe with a worldwide community who love the same spicy content you do.`;
      
      // Handle thumbnail selection logic similar to the client component
      let thumbnail = video.thumbnail;
      if (data.type === "image" && video.imageUrls && video.imageUrls.length > 0) {
        thumbnail = video.imageUrls[video.thumbnailIndex || 0];
      }
      
      if (!thumbnail) {
        thumbnail = "/logo.webp"; // Fallback
      }

      // Ensure absolute URL for thumbnail if it's relative
      if (thumbnail.startsWith("/")) {
        thumbnail = `${config.url}${thumbnail}`;
      }

      return {
        title: title, 
        description: description,
        openGraph: {
          title: title,
          description: description,
          url: `https://goonchan.org/watch?v=${videoSlug}`,
          siteName: "GoonChan",
          locale: "en_US",
          type: "video.other",
          images: [
            {
              url: thumbnail,
              width: 1280,
              height: 720,
              alt: title,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title: title,
          description: description,
          images: [thumbnail],
        },
        alternates: {
          canonical: `https://goonchan.org/watch?v=${videoSlug}`,
        },
      };
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
    // Fallback with error info for debugging (optional, remove in prod if needed)
    // return { title: `Error: ${error.message}` };
  }

  return {
    title: "Watch",
    openGraph: {
      title: "Watch Video",
      description: "Watch videos on GoonChan.",
      url: `https://goonchan.org/watch`,
      siteName: "GoonChan",
      locale: "en_US",
      type: "website",
      images: [{
        url: "https://goonchan.org/logo.webp", // Ensure this exists
        width: 1200,
        height: 630,
        alt: "GoonChan"
      }]
    },
    robots: {
      index: false,
      follow: true
    }
  };
}

export default function Page() {
  return <WatchClient />;
}
