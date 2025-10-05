"use client";
import { Poppins, Inter, Roboto } from "next/font/google";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { NavBarProvider, useNavBar } from "@/contexts/NavBarContext";
import NavBar from "@/components/NavBar";
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

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { config, user, setUser } = useNavBar();

  return (
    <>
      {config.show && (
        <NavBar
          user={user}
          setUser={setUser}
          showCategories={config.showCategories}
          activeCategory={config.activeCategory}
          setActiveCategory={config.setActiveCategory}
          onAdSettingsLoad={config.onAdSettingsLoad}
        />
      )}
      {children}
    </>
  );
}

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
        {/* <script
          src="https://chaturbate.com/affiliates/promotools/popup/H5o9o/popchaturbaterevshare.js"
          type="text/javascript"
          defer
        ></script> */}
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="6220e997-c016-4b06-a191-476a13ca2184"
        ></script>
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${roboto.variable} antialiased`}
      >
        <GoogleOAuthProvider clientId="93231412308-nddbtq85qlh653qd40s4fsjnbtjf96si.apps.googleusercontent.com">
          <NavBarProvider>
            <Toaster richColors theme="dark" position="bottom-right" />
            <LayoutContent>{children}</LayoutContent>
          </NavBarProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
