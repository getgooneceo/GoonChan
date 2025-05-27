"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

const formatCount = (count) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  } else {
    return count.toString();
  }
};

const calculateLikePercentage = (likeCount = 0, dislikeCount = 0) => {
  if (likeCount === 0 && dislikeCount === 0) return 0;
  return Math.round((likeCount / (likeCount + dislikeCount)) * 100);
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const ProfileImageCard = ({ image }) => {
  const likePercentage = calculateLikePercentage(
    image.likedBy?.length || 0,
    image.dislikedBy?.length || 0
  );

  const thumbnailUrl = image.imageUrls && image.imageUrls.length > 0 
    ? image.imageUrls[image.thumbnailIndex || 0] 
    : null;

  if (!thumbnailUrl) {
    return null;
  }

  return (
    <Link href={`/image/${image.slug || image._id}`} className="group relative cursor-pointer">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#101010]">
        <Image
          src={thumbnailUrl}
          alt={image.title || ""}
          width={400}
          height={400}
          className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-300 ease-in-out"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[#00000059] opacity-95"></div>

        {/* Multiple images indicator */}
        {image.imageUrls && image.imageUrls.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22 16V4c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2zm-11-4l2.03 2.71L16 11l4 5H8l3-4zM2 6v14c0 1.1.9 2 2 2h14v-2H4V6H2z"/>
            </svg>
            {image.imageUrls.length}
          </div>
        )}
      </div>

      <div className="mt-2">
        <h3 className="font-medium text-white text-sm font-pop leading-normal group-hover:text-[#ea4197] transition-colors duration-200 line-clamp-2">
          {image.title}
        </h3>

        <div className="flex items-center mt-1 text-[#b1b1b1] sm:text-xs text-[0.6rem]">
          <span>{formatDate(image.uploadDate || image.createdAt)}</span>
          <span className="mx-1.5">•</span>
          <span>{formatCount(image.views || 0)} views</span>
          <span className="mx-1.5">•</span>
          <span className="text-[#ea4197]">{likePercentage}%</span>
        </div>
      </div>
    </Link>
  );
};

const ProfileImageGrid = ({ images }) => {
  if (!images || images.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-white/50">No images found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <ProfileImageCard key={image._id || image.id} image={image} />
      ))}
    </div>
  );
};

export default ProfileImageGrid;