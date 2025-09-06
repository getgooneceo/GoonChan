"use client";
import { Poppins, Inter, Roboto } from "next/font/google";
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>Goonchan</title>
        {/* <meta name="description" content="Adult content platform" /> */}
        <script src='https://chaturbate.com/affiliates/promotools/popup/H5o9o/popchaturbaterevshare.js' type='text/javascript' defer></script>
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${roboto.variable} antialiased`}
      >
        <GoogleOAuthProvider clientId="93231412308-nddbtq85qlh653qd40s4fsjnbtjf96si.apps.googleusercontent.com">
          <Toaster richColors theme="dark" position="top-right" />
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
