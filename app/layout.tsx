"use client";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        <meta name="description" content="Adult content platform" />
        <script src='https://chaturbate.com/affiliates/promotools/popup/H5o9o/popchaturbaterevshare.js' type='text/javascript' defer></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleOAuthProvider clientId="93231412308-nddbtq85qlh653qd40s4fsjnbtjf96si.apps.googleusercontent.com">
          <Toaster richColors theme="dark" position="top-right" />
          {children}
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
