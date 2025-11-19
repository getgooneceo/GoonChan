import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Footer = () => {
  return (
    <footer className="border-t border-neutral-800/50 mt-16 font-inter">
      <div className="max-w-[79rem] mx-auto px-4 lg:px-2 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          {/* Brand Section - Takes up 2 columns on desktop */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-white tracking-tight">Goon<span className='text-[#ea4197]'>Chan</span></h3>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed max-w-md">
              Free porn streaming with hot babes, rough sex, creampies, facials, and more. Watch, chat, and enjoy adult content.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-neutral-500">All systems operational</span>
            </div>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Legal</h4>
            <div className="space-y-2">
              <Link 
                href="/terms-of-service" 
                className="block text-neutral-400 hover:text-white transition-colors duration-200 text-sm"
              >
                Terms of Service
              </Link>
              <Link 
                href="/privacy-policy" 
                className="block text-neutral-400 hover:text-white transition-colors duration-200 text-sm"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/dmca" 
                className="block text-neutral-400 hover:text-white transition-colors duration-200 text-sm"
              >
                DMCA Notice
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider">Support</h4>
            <a 
              href="mailto:goonchan.support@proton.me" 
              className="block text-neutral-400 hover:text-white transition-colors duration-200 text-sm"
            >
              goonchan.support@proton.me
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-neutral-800/50 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <span className="text-neutral-500 text-xs">
                © {new Date().getFullYear()} GoonChan. All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a 
                href="https://theporndude.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className=" hover:opacity-80 transition-opacity"
              >
                <img
                  src="https://imagedelivery.net/r-vbuz6UTi1suESiZDzgHA/eb3e833d-700d-43dc-9251-96c6afa82500/public"
                  alt="TPD"
                  className="opacity-60 hover:opacity-100 transition-opacity mix-blend-lighten"
                  style={{ height: '14px', width: 'auto' }}
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;