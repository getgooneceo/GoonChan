import React, { useState, useEffect } from 'react';

const BannerAds = ({ 
  ads = null,
  className = ""
}) => {
  const allAds = [
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=598296&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/PMKT-1157_DESIGN-16618_BannersWebinar_SexiVegasXX_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=612046&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/JM-379_DESIGN-20876_v2_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=598462&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/PMKT-1157_DESIGN-16618_BannersWebinar_AmyPose_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=612577&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/008183C_JRKM_18_ALL_EN_64_L.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=605335&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/HawkTuah_Banners_GinaValentina_v1_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=600151&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/PMKT-1157_DESIGN-16618_BannersWebinar_HBD_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=606015&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/DESIGN-19806_Neon_300100_6.gif",
    },
  ];

  const [randomAds, setRandomAds] = useState([]);

  const getRandomAds = (adsArray, count = 3) => {
    const availableAds = [...adsArray];
    const randomAds = [];
    
    for (let i = 0; i < Math.min(count, availableAds.length); i++) {
      const randomIndex = Math.floor(Math.random() * availableAds.length);
      randomAds.push(availableAds[randomIndex]);
      availableAds.splice(randomIndex, 1);
    }
    
    return randomAds;
  };

  useEffect(() => {
    if (ads) {
      setRandomAds(ads);
    } else {
      setRandomAds(getRandomAds(allAds));
    }
  }, [ads]);

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