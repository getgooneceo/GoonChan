import { Poppins, Inter, Roboto } from "next/font/google";
import ClientLayout from "./ClientLayout";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-pop",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  metadataBase: new URL("https://goonchan.org"),
  title: {
    default: "GoonChan - Free Porn Videos, Enjoy Sexy NSFW Content",
    template: "%s | GoonChan"
  },
  description:
    "Watch, chat, and enjoy the wildest adult content on GoonChan. Explore trending porn videos, kinky categories, amateur uploads, and a global community that loves the same spicy action you do.",
  keywords: [
    "GoonChan", "adult content", "porn", "xxx", "sex", "nsfw", "adult videos", 
    "streaming", "porn videos", "free porn", "premium porn", "hentai", "doujin",
    "boobs", "tits", "big tits", "small tits",
    "ass", "big ass", "booty", "thick girls",
    "pussy", "tight pussy", "wet pussy",
    "blowjob", "handjob", "deepthroat",
    "doggystyle", "cowgirl", "missionary",
    "babe", "milf", "teen", "lesbian", "anal",
    "cumshot", "creampie", "facials",
    "rough sex", "softcore", "hardcore",
    "ebony", "asian", "latina", "white girls",
    "fetish", "bdsm", "cosplay porn",
    "amateur girls", "homemade porn",
    "adult community", "sexting", "nsfw chat",
    "watch and chat", "fan interaction"
  ],
  authors: [{ name: "GoonChan Team" }],
  creator: "GoonChan",
  publisher: "GoonChan",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "GoonChan - Free Porn Videos, Enjoy Sexy NSFW Content",
    description:
      "Watch free porn videos, hot sex clips, big tits, juicy asses, and tight pussy action on GoonChan. Stream hardcore, lesbian, blowjob, anal, and amateur videos while chatting with a global NSFW community who loves the same spicy content you do.",
    url: "https://goonchan.org",
    siteName: "GoonChan",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "GoonChan - Free Porn Videos, Enjoy Sexy NSFW Content",
    description:
      "Free porn streaming with hot babes, rough sex, lesbian action, creampies, facials, and more. Watch, chat, and enjoy NSFW content together on GoonChan.",
    creator: "@GoonChan",
  },
  alternates: {
    canonical: "/",
  },
  category: "adult",
  classification: "adult",
  rating: "RTA-5042-1996-1400-1577-RTA",
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "GoonChan",
    "url": "https://goonchan.org",
    "description":
      "Free porn streaming with hot babes, rough sex, lesbian action, creampies, facials, and more. Watch, chat, and enjoy NSFW content together on GoonChan.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://goonchan.org/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    },
    "publisher": {
      "@type": "Organization",
      "name": "GoonChan"
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="6220e997-c016-4b06-a191-476a13ca2184"
        ></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${poppins.variable} ${inter.variable} ${roboto.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
