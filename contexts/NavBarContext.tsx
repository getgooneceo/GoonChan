/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavBarConfig {
  show: boolean;
  showCategories: boolean;
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
  onAdSettingsLoad?: (adSettings: any) => void;
}

interface NavBarContextType {
  config: NavBarConfig;
  setConfig: (config: Partial<NavBarConfig>) => void;
  user: any;
  setUser: (user: any) => void;
}

const NavBarContext = createContext<NavBarContextType | undefined>(undefined);

export const NavBarProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [config, setConfigState] = useState<NavBarConfig>({
    show: true,
    showCategories: false,
  });

  const setConfig = (newConfig: Partial<NavBarConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  };

  return (
    <NavBarContext.Provider value={{ config, setConfig, user, setUser }}>
      {children}
    </NavBarContext.Provider>
  );
};

export const useNavBar = () => {
  const context = useContext(NavBarContext);
  if (context === undefined) {
    throw new Error('useNavBar must be used within a NavBarProvider');
  }
  return context;
};
