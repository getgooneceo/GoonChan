import React, { useState, useEffect } from 'react';

const BannerAds = ({ 
  ads = [],
  className = ""
}) => {
  const [randomAds, setRandomAds] = useState([]);

  const getRandomAds = (adsArray, count = 3) => {
    const shuffledAds = [...adsArray];

    for (let i = shuffledAds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledAds[i], shuffledAds[j]] = [shuffledAds[j], shuffledAds[i]];
    }

    return shuffledAds.slice(0, Math.min(count, shuffledAds.length));
  };

  useEffect(() => {
    if (ads && ads.length > 0) {
      setRandomAds(getRandomAds(ads));
    }
  }, [ads]);

  // Don't render anything if there are no ads
  if (!randomAds || randomAds.length === 0) {
    return null;
  }

  return (
    <div className={`w-full px-10 md:px-0 rounded-lg overflow-hidden ${className}`}>
      <div className="flex flex-wrap justify-center gap-4">
        {randomAds.map((ad, index) => (
          <div
            key={index}
            className={`w-full ${index >= 1 ? "hidden sm:block" : ""} ${
              index >= 2 ? "sm:hidden lg:block" : ""
            } sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]`}
          >
            <a href={ad.href} className="block w-full">
              <img
                src={ad.imgSrc}
                className="w-full h-auto max-h-32 object-contain mx-auto"
                alt={`Advertisement ${index + 1}`}
              />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BannerAds;