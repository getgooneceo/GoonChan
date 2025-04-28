import { VideoType, CommentType } from "@/components/Types";

// Reusable comments for videos
const commonComments: CommentType[] = [
  {
    id: 1,
    username: "VideoFanatic",
    avatar: "https://i.pravatar.cc/150?img=1",
    content: "This is one of the best videos I've seen this month! The quality is outstanding.",
    likes: 342,
    timeAgo: "2 days ago"
  },
  {
    id: 2,
    username: "CasualViewer123",
    avatar: "https://i.pravatar.cc/150?img=2",
    content: "I've been waiting for content like this. Absolutely loved it from start to finish!",
    likes: 215,
    timeAgo: "3 days ago"
  },
  {
    id: 3,
    username: "ContentCreator",
    avatar: "https://i.pravatar.cc/150?img=3",
    content: "As someone who makes similar content, I really appreciate the effort that went into this. Great job!",
    likes: 178,
    timeAgo: "1 week ago",
    replies: [
      {
        id: 31,
        username: "ReplyGuy",
        avatar: "https://i.pravatar.cc/150?img=4",
        content: "I agree, the production value is incredible!",
        likes: 42,
        timeAgo: "6 days ago"
      }
    ]
  },
  {
    id: 4,
    username: "TechEnthusiast",
    avatar: "https://i.pravatar.cc/150?img=5",
    content: "What equipment did you use to shoot this? The quality is amazing!",
    likes: 131,
    timeAgo: "2 weeks ago"
  },
  {
    id: 5,
    username: "FirstTimer",
    avatar: "https://i.pravatar.cc/150?img=6",
    content: "First time watching your content and I'm already a fan. Subscribed!",
    likes: 98,
    timeAgo: "3 weeks ago"
  },
  {
    id: 6,
    username: "DetailObserver",
    avatar: "https://i.pravatar.cc/150?img=7",
    content: "I noticed so many small details that made this video special. The attention to detail is impressive.",
    likes: 87,
    timeAgo: "1 month ago"
  },
  {
    id: 7,
    username: "CriticalThinker",
    avatar: "https://i.pravatar.cc/150?img=8",
    content: "Great content overall, but I think there could be more depth in certain sections.",
    likes: 65,
    timeAgo: "1 month ago"
  },
  {
    id: 8,
    username: "RegularFan",
    avatar: "https://i.pravatar.cc/150?img=9",
    content: "Always looking forward to your uploads. Never disappoints!",
    likes: 122,
    timeAgo: "1 month ago"
  },
  {
    id: 9,
    username: "QuestionAsker",
    avatar: "https://i.pravatar.cc/150?img=10",
    content: "Will you be making more content like this in the future? Really enjoyed this one!",
    likes: 54,
    timeAgo: "2 months ago"
  },
  {
    id: 10,
    username: "AppreciationPost",
    avatar: "https://i.pravatar.cc/150?img=11",
    content: "The amount of work that must have gone into this... Thank you for sharing your talent!",
    likes: 201,
    timeAgo: "2 months ago"
  }
];

// Function to generate unique comments for each video
const generateUniqueComments = (videoId: number): CommentType[] => {
  // Create a copy to avoid modifying the original
  const comments = JSON.parse(JSON.stringify(commonComments)) as CommentType[];
  
  // Make them unique by adding the video ID to the comment ID
  return comments.map(comment => ({
    ...comment,
    id: comment.id * 1000 + videoId,
    replies: comment.replies ? comment.replies.map(reply => ({
      ...reply,
      id: reply.id * 1000 + videoId
    })) : undefined
  }));
};

// Export video data for use across the application
export const videoData: VideoType[] = [
  {
    id: 1,
    title: "Stunning sunset over mountain landscape",
    thumbnail: "https://images.unsplash.com/photo-1682685797898-6d7587974771?q=80&w=1470&auto=format&fit=crop",
    duration: "12:34",
    views: 1400000,
    uploader: "NatureVibes",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    uploadDate: "April 15, 2025",
    description: "Witness the breathtaking beauty of the sun setting behind the majestic mountains. This timelapse was captured over several hours using state-of-the-art equipment to ensure the highest quality viewing experience. The shifting colors of the sky create a mesmerizing display that showcases nature's artistry.",
    subscriberCount: 2300000,
    likeCount: 152430,
    dislikeCount: 2814,
    comments: generateUniqueComments(1),
    tags: ["nature", "sunset", "timelapse", "mountains", "landscape", "4K"]
  },
  {
    id: 2,
    title: "Urban exploration: hidden gems of New York",
    thumbnail: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1470&auto=format&fit=crop",
    duration: "18:22",
    views: 876000,
    uploader: "CityWanderer",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    uploadDate: "April 10, 2025",
    description: "Join me as I discover the lesser-known treasures of New York City. From hidden courtyards to secret speakeasies, we'll venture beyond the typical tourist attractions to experience the authentic NYC that most visitors never see. This episode explores the historic neighborhoods of Lower Manhattan.",
    subscriberCount: 1200000,
    likeCount: 82421,
    dislikeCount: 3218,
    comments: generateUniqueComments(2),
    tags: ["travel", "NYC", "urban exploration", "city guide", "hidden gems"]
  },
  {
    id: 3,
    title: "The art of making perfect homemade pasta",
    thumbnail: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=1532&auto=format&fit=crop",
    duration: "22:10",
    views: 2100000,
    uploader: "ChefMaster",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    uploadDate: "April 5, 2025",
    description: "Learn the authentic Italian techniques for creating delicious homemade pasta from scratch. I share my grandmother's traditional recipes and methods passed down through generations, explaining the perfect flour-to-egg ratio and demonstrating proper kneading techniques to achieve that perfect al dente texture.",
    subscriberCount: 3700000,
    likeCount: 205842,
    dislikeCount: 1842,
    comments: generateUniqueComments(3),
    tags: ["cooking", "pasta", "italian cuisine", "recipe", "homemade", "tutorial"]
  },
  {
    id: 4,
    title: "Ocean waves: relaxing sounds for meditation",
    thumbnail: "https://images.unsplash.com/photo-1518398046578-8cca57782e17?q=80&w=1470&auto=format&fit=crop",
    duration: "45:00",
    views: 3200000,
    uploader: "MindfulnessJourney",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    uploadDate: "March 28, 2025",
    description: "Immerse yourself in the calming sounds of ocean waves gently breaking on a pristine beach. This 45-minute audio-visual experience was recorded using binaural microphones to create a deeply immersive soundscape perfect for meditation, relaxation, or aiding sleep. The video features gentle waves at sunset on the Pacific coast.",
    subscriberCount: 5100000,
    likeCount: 315730,
    dislikeCount: 1204,
    comments: generateUniqueComments(4),
    tags: ["meditation", "relaxation", "ocean sounds", "sleep aid", "ambient", "ASMR"]
  },
  {
    id: 5,
    title: "Extreme sports: wingsuit flying in the Alps",
    thumbnail: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c3BvcnRzfGVufDB8fDB8fHww",
    duration: "08:45",
    views: 5700000,
    uploader: "AdventurePeak",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    uploadDate: "March 22, 2025",
    description: "Experience the adrenaline rush of wingsuit flying through the stunning Alpine mountain ranges. Shot with multiple 4K cameras including helmet-mounted GoPros, this video takes you on a breathtaking journey as we soar through narrow passages and open valleys at speeds exceeding 120mph. Not for the faint of heart!",
    subscriberCount: 4300000,
    likeCount: 553421,
    dislikeCount: 8723,
    comments: generateUniqueComments(5),
    tags: ["extreme sports", "wingsuit", "Alps", "adrenaline", "adventure", "GoPro"]
  },
  {
    id: 6,
    title: "Tokyo at night: neon lights and city vibes",
    thumbnail: "https://images.unsplash.com/photo-1480796927426-f609979314bd?q=80&w=1470&auto=format&fit=crop",
    duration: "15:30",
    views: 1800000,
    uploader: "TokyoDrifter",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    uploadDate: "March 15, 2025",
    description: "Walk with me through the vibrant streets of Tokyo after dark, when the city truly comes alive with neon lights. This nighttime tour explores Shinjuku, Shibuya, and Akihabara districts, showcasing the unique atmosphere that makes Tokyo one of the most visually spectacular cities in the world.",
    subscriberCount: 1700000,
    likeCount: 171045,
    dislikeCount: 4523,
    comments: generateUniqueComments(6),
    tags: ["Tokyo", "Japan", "night life", "travel", "city tour", "neon"]
  },
  {
    id: 7,
    title: "Morning yoga routine for beginners",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1520&auto=format&fit=crop",
    duration: "27:15",
    views: 962000,
    uploader: "ZenMaster",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    uploadDate: "March 10, 2025",
    description: "Start your day with this gentle, beginner-friendly yoga routine designed to energize your body and calm your mind. Perfect for those new to yoga, this step-by-step session focuses on proper alignment and breathing techniques. The 27-minute practice can be done in a small space with minimal equipment.",
    subscriberCount: 879000,
    likeCount: 92352,
    dislikeCount: 1842,
    comments: generateUniqueComments(7),
    tags: ["yoga", "fitness", "beginner", "morning routine", "wellness", "tutorial"]
  },
  {
    id: 8,
    title: "Desert safari: journey through the Sahara",
    thumbnail: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?q=80&w=1476&auto=format&fit=crop",
    duration: "32:40",
    views: 724000,
    uploader: "DesertExplorer",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    uploadDate: "March 3, 2025",
    description: "Join our expedition across the magnificent Sahara Desert as we traverse the endless dunes by camel and 4x4. This documentary-style video captures the harsh beauty of the world's largest hot desert, showcasing its unique ecosystem, the nomadic peoples who call it home, and the stunning starlit skies that can only be experienced in such remote locations.",
    subscriberCount: 642000,
    likeCount: 66608,
    dislikeCount: 3412,
    comments: generateUniqueComments(8),
    tags: ["travel", "desert", "Sahara", "expedition", "documentary", "adventure"]
  },
  {
    id: 9,
    title: "Northern lights: a magical night in Iceland",
    thumbnail: "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?q=80&w=1470&auto=format&fit=crop",
    duration: "16:20",
    views: 2600000,
    uploader: "AuroraChasers",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    uploadDate: "February 25, 2025",
    description: "Witness the ethereal beauty of the Aurora Borealis dancing across the Icelandic night sky. This real-time footage captures one of the most spectacular northern lights displays of the year, filmed near Reykjavik during optimal solar activity. The video includes information about the science behind this natural phenomenon and tips for viewing it yourself.",
    subscriberCount: 2100000,
    likeCount: 257400,
    dislikeCount: 1153,
    comments: generateUniqueComments(9),
    tags: ["northern lights", "Iceland", "aurora borealis", "night sky", "timelapse", "nature"]
  },
  {
    id: 10,
    title: "Vintage car restoration: 1967 Mustang",
    thumbnail: "https://images.unsplash.com/photo-1532974297617-c0f05fe48bff?q=80&w=1374&auto=format&fit=crop",
    duration: "42:15",
    views: 1100000,
    uploader: "ClassicRides",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    uploadDate: "February 18, 2025",
    description: "Follow the complete restoration process of a classic 1967 Ford Mustang from barn find to showroom condition. This comprehensive guide covers every aspect of the restoration including engine rebuilding, bodywork, interior refurbishment, and paint job. Perfect for vintage car enthusiasts and DIY mechanics looking to undertake their own restoration project.",
    subscriberCount: 1400000,
    likeCount: 106700,
    dislikeCount: 1450,
    comments: generateUniqueComments(10),
    tags: ["cars", "restoration", "classic", "Mustang", "automotive", "DIY"]
  },
  {
    id: 11,
    title: "Wildlife encounter: lions in their natural habitat",
    thumbnail: "https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?q=80&w=1374&auto=format&fit=crop",
    duration: "25:30",
    views: 3800000,
    uploader: "SafariLife",
    videoUrl: "https://customer-f33zs165nr7gyfy4.cloudflarestream.com/6b9e68b07dfee8cc2d116e4c51d6a957/manifest/video.m3u8",
    uploadDate: "February 10, 2025",
    description: "Experience an intimate encounter with a pride of lions in the Serengeti National Park. This rare footage captures natural hunting behaviors, social interactions, and cub rearing, offering viewers unprecedented insight into the lives of these magnificent predators. Filmed over three weeks using long-range cameras to avoid disturbing the animals.",
    subscriberCount: 3500000,
    likeCount: 372400,
    dislikeCount: 2712,
    comments: generateUniqueComments(11),
    tags: ["wildlife", "lions", "safari", "Serengeti", "nature", "documentary"]
  },
  {
    id: 12,
    title: "Cyberpunk aesthetic: digital art process",
    thumbnail: "https://images.unsplash.com/photo-1580250864656-cd501faa9c76?q=80&w=1374&auto=format&fit=crop",
    duration: "19:45",
    views: 842000,
    uploader: "NeonArtist",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    uploadDate: "February 5, 2025",
    description: "Watch my complete digital art process as I create a detailed cyberpunk cityscape from scratch. This step-by-step tutorial demonstrates advanced techniques in digital painting, lighting effects, and composition using professional software. I share insights into creating the distinctive neon-lit aesthetic that defines the cyberpunk genre.",
    subscriberCount: 754000,
    likeCount: 78306,
    dislikeCount: 2967,
    comments: generateUniqueComments(12),
    tags: ["digital art", "cyberpunk", "tutorial", "speedpaint", "design", "Procreate"]
  },
  {
    id: 13,
    title: "Abandoned places: forgotten mansion exploration",
    thumbnail: "https://images.unsplash.com/photo-1560026301-88340cf16be7?q=80&w=1376&auto=format&fit=crop",
    duration: "28:10",
    views: 1500000,
    uploader: "UrbanMyths",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    uploadDate: "January 30, 2025",
    description: "Join me as I explore a magnificent abandoned mansion with a mysterious history dating back to the 1920s. Left untouched for decades, this once-opulent residence reveals fascinating clues about its former inhabitants and the circumstances that led to its abandonment. The exploration includes the main house, servant quarters, and extensive grounds.",
    subscriberCount: 1300000,
    likeCount: 142500,
    dislikeCount: 3750,
    comments: generateUniqueComments(13),
    tags: ["urban exploration", "abandoned", "mansion", "history", "mystery", "urbex"]
  },
  {
    id: 14,
    title: "Aerial drone footage: Hawaiian coastline",
    thumbnail: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?q=80&w=1527&auto=format&fit=crop",
    duration: "14:25",
    views: 975000,
    uploader: "IslandLife",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    uploadDate: "January 22, 2025",
    description: "Soar above the pristine coastlines of Hawaii's most beautiful islands in this stunning aerial compilation. Filmed using a professional drone equipped with a 6K camera, this video showcases secret beaches, dramatic cliffs, tropical rainforests, and crystal-clear waters that highlight the paradise-like nature of the Hawaiian archipelago.",
    subscriberCount: 892000,
    likeCount: 94575,
    dislikeCount: 1432,
    comments: generateUniqueComments(14),
    tags: ["drone footage", "Hawaii", "aerial", "beaches", "travel", "4K"]
  },
  {
    id: 15,
    title: "Rainy day coffee shop ambience",
    thumbnail: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=1383&auto=format&fit=crop",
    duration: "60:00",
    views: 4200000,
    uploader: "RelaxSounds",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    uploadDate: "January 15, 2025",
    description: "Create the perfect background atmosphere with this one-hour ambient soundscape featuring gentle rainfall outside a cozy coffee shop. The soothing combination of rain pattering against windows, soft café chatter, occasional coffee machine sounds, and subtle jazz music creates an ideal environment for studying, working, or relaxing.",
    subscriberCount: 4700000,
    likeCount: 415800,
    dislikeCount: 832,
    comments: generateUniqueComments(15),
    tags: ["ambience", "coffee shop", "rain sounds", "relaxation", "study music", "ASMR"]
  },
  {
    id: 16,
    title: "Street food tour: spicy Thai cuisine",
    thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1470&auto=format&fit=crop",
    duration: "24:35",
    views: 1700000,
    uploader: "FoodJourney",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    uploadDate: "January 8, 2025",
    description: "Embark on a mouthwatering tour of Bangkok's bustling street food scene. From fiery som tam (papaya salad) to aromatic pad thai and indulgent mango sticky rice, this culinary adventure introduces you to authentic Thai flavors and cooking techniques. I share insights about ingredients, cultural significance, and tips for finding the best street food stalls.",
    subscriberCount: 1900000,
    likeCount: 163200,
    dislikeCount: 3264,
    comments: generateUniqueComments(16),
    tags: ["food", "street food", "Thai cuisine", "Bangkok", "culinary", "travel"]
  }
];