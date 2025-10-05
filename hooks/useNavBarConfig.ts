/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useNavBar } from '@/contexts/NavBarContext';

interface NavBarConfigOptions {
  show?: boolean;
  showCategories?: boolean;
  activeCategory?: string;
  setActiveCategory?: (category: string) => void;
  onAdSettingsLoad?: (adSettings: any) => void;
}

export const useNavBarConfig = (options: NavBarConfigOptions) => {
  const { setConfig } = useNavBar();

  useEffect(() => {
    setConfig(options);
  }, [options.show, options.showCategories, options.activeCategory]);
};
