import Image from "next/image";
import NavBar from "@/components/NavBar";
import VideoGrid from "@/components/VideoGrid";
import { VideoType } from "@/components/VideoGrid";

export default function Home() {
  // Video data defined in the homepage and passed to VideoGrid component
  const videoData: VideoType[] = [
    {
      id: 1,
      title: "Stunning sunset over mountain landscape",
      thumbnail: "https://images.unsplash.com/photo-1682685797898-6d7587974771?q=80&w=1470&auto=format&fit=crop",
      duration: "12:34",
      views: "1.4M",
      likes: "96%",
      uploader: "NatureVibes"
    },
    {
      id: 2,
      title: "Urban exploration: hidden gems of New York",
      thumbnail: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1470&auto=format&fit=crop",
      duration: "18:22",
      views: "876K",
      likes: "94%",
      uploader: "CityWanderer"
    },
    {
      id: 3,
      title: "The art of making perfect homemade pasta",
      thumbnail: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1532&auto=format&fit=crop",
      duration: "22:10",
      views: "2.1M",
      likes: "98%",
      uploader: "ChefMaster"
    },
    {
      id: 4,
      title: "Ocean waves: relaxing sounds for meditation",
      thumbnail: "https://images.unsplash.com/photo-1518398046578-8cca57782e17?q=80&w=1470&auto=format&fit=crop",
      duration: "45:00",
      views: "3.2M",
      likes: "99%",
      uploader: "MindfulnessJourney"
    },
    {
      id: 5,
      title: "Extreme sports: wingsuit flying in the Alps",
      thumbnail: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3BvcnRzfGVufDB8fDB8fHww",
      duration: "08:45",
      views: "5.7M",
      likes: "97%",
      uploader: "AdventurePeak"
    },
    {
      id: 6,
      title: "Tokyo at night: neon lights and city vibes",
      thumbnail: "https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=1470&auto=format&fit=crop",
      duration: "15:30",
      views: "1.8M",
      likes: "95%",
  
      uploader: "TokyoDrifter"
    },
    {
      id: 7,
      title: "Morning yoga routine for beginners",
      thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1520&auto=format&fit=crop",
      duration: "27:15",
      views: "962K",
      likes: "96%",
      uploader: "ZenMaster"
    },
    {
      id: 8,
      title: "Desert safari: journey through the Sahara",
      thumbnail: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=1476&auto=format&fit=crop",
      duration: "32:40",
      views: "724K",
      likes: "92%",
      uploader: "DesertExplorer"
    },
    {
      id: 9,
      title: "Northern lights: a magical night in Iceland",
      thumbnail: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?q=80&w=1470&auto=format&fit=crop",
      duration: "16:20",
      views: "2.6M",
      likes: "99%",
      uploader: "AuroraChasers"
    },
    {
      id: 10,
      title: "Vintage car restoration: 1967 Mustang",
      thumbnail: "https://images.unsplash.com/photo-1532974297617-c0f05fe48bff?q=80&w=1374&auto=format&fit=crop",
      duration: "42:15",
      views: "1.1M",
      likes: "97%",
      uploader: "ClassicRides"
    },
    {
      id: 11,
      title: "Wildlife encounter: lions in their natural habitat",
      thumbnail: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?q=80&w=1374&auto=format&fit=crop",
      duration: "25:30",
      views: "3.8M",
      likes: "98%",
      uploader: "SafariLife"
    },
    {
      id: 12,
      title: "Cyberpunk aesthetic: digital art process",
      thumbnail: "https://images.unsplash.com/photo-1580250864656-cd501faa9c76?q=80&w=1374&auto=format&fit=crop",
      duration: "19:45",
      views: "842K",
      likes: "93%",
      uploader: "NeonArtist"
    },
    {
      id: 13,
      title: "Abandoned places: forgotten mansion exploration",
      thumbnail: "https://images.unsplash.com/photo-1560026301-88340cf16be7?q=80&w=1376&auto=format&fit=crop",
      duration: "28:10",
      views: "1.5M",
      likes: "95%",
      uploader: "UrbanMyths"
    },
    {
      id: 14,
      title: "Aerial drone footage: Hawaiian coastline",
      thumbnail: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?q=80&w=1527&auto=format&fit=crop",
      duration: "14:25",
      views: "975K",
      likes: "97%",
      uploader: "IslandLife"
    },
    {
      id: 15,
      title: "Rainy day coffee shop ambience",
      thumbnail: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=1383&auto=format&fit=crop",
      duration: "60:00",
      views: "4.2M",
      likes: "99%",
      uploader: "RelaxSounds"
    },
    {
      id: 16,
      title: "Street food tour: spicy Thai cuisine",
      thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1470&auto=format&fit=crop",
      duration: "24:35",
      views: "1.7M",
      likes: "96%",
      uploader: "FoodJourney"
    }
  ];

  return (
    <>
      <div className="bg-[#080808] min-h-screen w-full">
        <NavBar />
        <VideoGrid videos={videoData} />
      </div>
    </>
  );
}
