import React, { useState, useEffect } from 'react';

const BannerAds = ({ 
  ads = null,
  className = ""
}) => {
  const allAds = [
    
    // Candy AI Ads
    {
      href: "https://t.mbsrv2.com/324742/9022/37752?aff_sub=goonchan&aff_sub5=SF_006OG000004lmDN",
      imgSrc: "https://www.imglnkx.com/9022/Create_anime_900x250_candyai.gif",
    },
    {
      href: "https://t.mbsrv2.com/324742/9022/37752?aff_sub=goonchan&aff_sub5=SF_006OG000004lmDN",
      imgSrc: "https://www.imglnkx.com/9022/Create_anime_900x250.gif",
    },
    {
      href: "https://t.mbsrv2.com/324742/9022/0?file_id=619855&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/9022/candy.ai_300x100_brunette_create-girlfriend_02.gif",
    },
    {
      href: "https://t.mbsrv2.com/324742/9022/0?file_id=601199&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/9022/01_realistic_nsfw_900x250_candy_banner.gif",
    },
    // TODO: Add more AI NSFW banner variations here
    
    // ThotChat Ads
    {
      href: "https://t.mbsrv2.com/324742/7566?popUnder=true&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/10082/ThotChat.Ai_anime_300100_04.gif",
    },
    {
      href: "https://t.mbsrv2.com/324742/7566?popUnder=true&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/10082/ThotChat.Ai_anime_300100_01.gif",
    },
    
    // Jerkmate Ads
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
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=628787&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/JM-885_DESIGN-23145_MOH-randomhotties_aprilolsen_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=602574&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/PMKT-1132_DESIGN-17536_AlyxStar_Jerkmate_300100.gif",
    },
    {
      href: "https://t.mbslr2.com/324742/8780/0?bo=2779,2778,2777,2776,2775&file_id=611790&po=6533&aff_sub5=SF_006OG000004lmDN&aff_sub4=AT_0002",
      imgSrc: "https://www.imglnkx.com/8780/000110F_JRKM_18_ALL_EN_64_L.gif",
    },
  ];

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