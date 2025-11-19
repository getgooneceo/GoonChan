"use client";

import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { NavBarProvider, useNavBar } from "@/contexts/NavBarContext";
import NavBar from "@/components/NavBar";
import { usePathname } from "next/navigation";

function LayoutContent({ children }) {
  const { config, user, setUser } = useNavBar();
  const pathname = usePathname();
  
  // Pages where navbar should never show (includes /chat and /chat/[id])
  const shouldHideNavbar = pathname.startsWith('/chat');

  return (
    <>
      {!shouldHideNavbar && config.show && (
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

export default function ClientLayout({ children }) {
  return (
    <GoogleOAuthProvider clientId="93231412308-nddbtq85qlh653qd40s4fsjnbtjf96si.apps.googleusercontent.com">
      <NavBarProvider>
        <Toaster richColors theme="dark" position="bottom-right" />
        <LayoutContent>{children}</LayoutContent>
      </NavBarProvider>
    </GoogleOAuthProvider>
  );
}
