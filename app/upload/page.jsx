"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RiImageAddLine,
  RiVideoAddLine,
  RiUpload2Line,
  RiArrowGoBackLine,
  RiCloseLine,
} from "react-icons/ri";
import Link from "next/link";
import config from "../../config.json";
import { Toaster, toast } from "sonner";
import * as tus from "tus-js-client";

const UploadPageLoading = () => {
  return (
    <div className="min-h-screen py-6 md:py-12">
      <div className="max-w-6xl mx-auto px-4 mb-6 md:mb-8">
        <div className="h-8 bg-white/5 rounded-lg w-48 mb-2 animate-pulse"></div>
        <div className="h-4 bg-white/5 rounded-lg w-64 animate-pulse"></div>
      </div>
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column Skeleton */}
          <div className="space-y-4">
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-3">
              <div className="flex gap-2">
                <div className="h-10 bg-white/5 rounded-lg w-24 animate-pulse"></div>
                <div className="h-10 bg-white/5 rounded-lg w-24 animate-pulse"></div>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 md:p-6">
              <div className="aspect-video bg-white/5 rounded-lg animate-pulse"></div>
            </div>
          </div>
          {/* Right Column Skeleton */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 md:p-6">
            <div className="space-y-5">
              <div className="h-20 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-32 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-white/5 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadPageContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uploadType = searchParams.get("type") || "video";

  const TITLE_MAX_LENGTH = 100;
  const DESCRIPTION_MAX_LENGTH = 500;
  const MAX_TAGS = 10;
  const MAX_TAG_LENGTH = 25;

  const [filePreview, setFilePreview] = useState(null);
  const [fileSelected, setFileSelected] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [videoDuration, setVideoDuration] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(''); // 'requesting', 'uploading', 'completing'
  const [currentUpload, setCurrentUpload] = useState(null); // TUS upload instance

  const [galleryFiles, setGalleryFiles] = useState([]);
  const [selectedThumbnailIndex, setSelectedThumbnailIndex] = useState(0);
  const MAX_GALLERY_FILES = 12;

  const fileInputRef = React.useRef(null);
  const replaceInputRef = React.useRef(null);
  const thumbnailInputRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (filePreview && typeof filePreview === 'string' && filePreview.startsWith('blob:')) {
        try { URL.revokeObjectURL(filePreview); } catch {}
      }
    };
  }, [filePreview]);

  const pageTitle = uploadType === "photo" ? "Upload Photo" : "Upload Video";
  const TypeIcon = uploadType === "photo" ? RiImageAddLine : RiVideoAddLine;

  const getVideoDuration = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        resolve(duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        reject(new Error('Error loading video metadata'));
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }
      try {
        const response = await fetch(`${config.url}/api/check`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!data.success || !data.user) {
          localStorage.removeItem("token"); 
          router.push("/");
        } else {
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  const resetFormData = () => {
    setFilePreview(null);
    setFileSelected(null);
    setTitle("");
    setDescription("");
    setTags("");
    setIsUploading(false);
    setIsDragging(false);
    setThumbnailFile(null);
    setVideoDuration(null);
    setGalleryFiles([]);
    setSelectedThumbnailIndex(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  useEffect(() => {
    resetFormData();
  }, [uploadType]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (uploadType === "photo") {
      const validImages = files.filter((file) => file.type.startsWith("image/"));
      if (validImages.length === 0) {
        toast.error("Please select valid image files");
        return;
      }

      if (galleryFiles.length + validImages.length > MAX_GALLERY_FILES) {
        toast.info(`You can upload a maximum of ${MAX_GALLERY_FILES} images.`);
      }

      const newGallery = [...galleryFiles, ...validImages].slice(0, MAX_GALLERY_FILES);
      setGalleryFiles(newGallery);

      if (!fileSelected) {
        setFileSelected(newGallery[0]);
        const reader = new FileReader();
        reader.onload = () => {
          setFilePreview(reader.result);
        };
        reader.readAsDataURL(newGallery[0]);
      }

      if (selectedThumbnailIndex === null && newGallery.length > 0) {
        setSelectedThumbnailIndex(0);
      }
    } else if (uploadType === "video") {
      const videoFile = files.find((file) => file.type.startsWith("video/"));
      if (!videoFile) {
        toast.error("Please select a valid video file");
        return;
      }
      setFileSelected(videoFile);

      try {
        const duration = await getVideoDuration(videoFile);
        setVideoDuration(duration);
        console.log(`Video duration: ${duration} seconds`);
      } catch (error) {
        console.warn("Could not extract video duration:", error);
        setVideoDuration(null);
      }

      const objectUrl = URL.createObjectURL(videoFile);
      setFilePreview(objectUrl);
    }
  };

  const handleFileReplace = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (uploadType === "photo") {
      const validImages = files.filter((file) => file.type.startsWith("image/"));
      if (validImages.length === 0) {
        toast.error("Please select valid image files");
        return;
      }

      const newFile = validImages[0];
      const newGallery = [...galleryFiles];
      newGallery[selectedThumbnailIndex] = newFile;
      setGalleryFiles(newGallery);

      setFileSelected(newFile);
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(newFile);

      toast.info("Image replaced successfully");
    } else if (uploadType === "video") {
      const videoFile = files.find((file) => file.type.startsWith("video/"));
      if (!videoFile) {
        toast.error("Please select a valid video file");
        return;
      }

      setFileSelected(videoFile);

      try {
        const duration = await getVideoDuration(videoFile);
        setVideoDuration(duration);
        console.log(`Video duration: ${duration} seconds`);
      } catch (error) {
        console.warn("Could not extract video duration:", error);
        setVideoDuration(null);
      }

      const objectUrl = URL.createObjectURL(videoFile);
      setFilePreview(objectUrl);

      toast.info("Video replaced successfully");
    }

    e.target.value = '';
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file for thumbnail");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Thumbnail must be less than 5MB");
      return;
    }

    setThumbnailFile(file);
    toast.info("Thumbnail selected successfully");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);

      if (uploadType === "photo") {
        const validImages = files.filter((file) => file.type.startsWith("image/"));
        if (validImages.length === 0) {
          toast.error("Please drop valid image files");
          return;
        }

        if (galleryFiles.length + validImages.length > MAX_GALLERY_FILES) {
          toast.info(`You can upload a maximum of ${MAX_GALLERY_FILES} images. Only the first ${MAX_GALLERY_FILES - galleryFiles.length} will be added.`);
        }

        const newGallery = [...galleryFiles, ...validImages].slice(0, MAX_GALLERY_FILES);
        setGalleryFiles(newGallery);

        if (!fileSelected) {
          setFileSelected(newGallery[0]);
          const reader = new FileReader();
          reader.onload = () => {
            setFilePreview(reader.result);
          };
          reader.readAsDataURL(newGallery[0]);
        }

        if (selectedThumbnailIndex === null && newGallery.length > 0) {
          setSelectedThumbnailIndex(0);
        }
      } else if (uploadType === "video") {
        const videoFile = files.find((file) => file.type.startsWith("video/"));
        if (!videoFile) {
          toast.error("Please drop a valid video file");
          return;
        }

        setFileSelected(videoFile);

        try {
          const duration = await getVideoDuration(videoFile);
          setVideoDuration(duration);
          console.log(`Video duration: ${duration} seconds`);
        } catch (error) {
          console.warn("Could not extract video duration:", error);
          setVideoDuration(null);
        }

        const objectUrl = URL.createObjectURL(videoFile);
        setFilePreview(objectUrl);
      }
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    if (newTitle.length <= TITLE_MAX_LENGTH) {
      setTitle(newTitle);
    }
  };

  const handleDescriptionChange = (e) => {
    const newDescription = e.target.value;

    const newLineCount = (newDescription.match(/\n/g) || []).length;

    if (newDescription.length <= DESCRIPTION_MAX_LENGTH && newLineCount <= 10) {
      setDescription(newDescription);
    } else if (newLineCount > 10) {
      const lines = newDescription.split("\n");
      if (lines.length > 11) {
        const limitedText = lines.slice(0, 11).join("\n");
        setDescription(limitedText);

        toast.info("Maximum 10 line breaks allowed in description");
      }
    }
  };

  const handleTagsChange = (e) => {
    const inputValue = e.target.value;

    const sanitizedInput = inputValue.replace(/[^a-zA-Z0-9 ]/g, "");

    const tagArray = sanitizedInput.split(" ").filter((tag) => tag !== "");

    const oversizedTagIndex = tagArray.findIndex(
      (tag) => tag.length > MAX_TAG_LENGTH
    );

    if (oversizedTagIndex !== -1) {
      tagArray[oversizedTagIndex] = tagArray[oversizedTagIndex].substring(
        0,
        MAX_TAG_LENGTH
      );
      const truncatedInput = tagArray.join(" ");
      setTags(truncatedInput);

      toast.info(`Tags must be ${MAX_TAG_LENGTH} characters or less`);
      return;
    }

    if (tagArray.length <= MAX_TAGS) {
      setTags(sanitizedInput);
    } else {
      const limitedTags = tagArray.slice(0, MAX_TAGS).join(" ");
      setTags(limitedTags);

      toast.info(`Maximum ${MAX_TAGS} tags allowed`);
    }
  };

  const isUploadReady = () => {
    if (uploadType === "photo") {
      return galleryFiles.length > 0 && title.trim() && description.trim();
    } else if (uploadType === "video") {
      return fileSelected && title.trim() && description.trim();
    }
    return false;
  };

  const handleUpload = async () => {
    if (!isAuthenticated) {
      toast.error("Authentication failed. Please log in again.");
      router.push("/");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("No token found. Please log in.");
      router.push("/");
      return;
    }

    if (uploadType === "photo") {
      if (galleryFiles.length === 0) {
        toast.error("Please select at least one image to upload");
        return;
      }
      if (!title.trim()) {
        toast.error("Please enter a title for your upload");
        return;
      }
      if (!description.trim()) {
        toast.error("Please write a description for your upload");
        return;
      }

      setIsUploading(true);
      toast.loading("Uploading your images...", {
        id: "upload-toast",
        duration: Infinity,
      });

      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("tags", tags);
      formData.append("token", token);
      formData.append("thumbnailIndex", selectedThumbnailIndex.toString());
      
      galleryFiles.forEach((file, index) => {
        formData.append(`imageFile${index}`, file);
      });

      try {
        const response = await fetch(`${config.url}/api/uploadImage`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: "Unknown error during upload." }));
          throw new Error(errorData.message || `Upload failed with status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          toast.success("Images will be uploaded shortly!", {
            id: "upload-toast",
            duration: 3000,
          });
          setTimeout(() => {
            router.push("/");
          }, 1000);
        } else {
          throw new Error(result.message || "Upload failed. Please try again.");
        }
      } catch (error) {
        console.error("Upload failed:", error);
        toast.error(`Upload failed: ${error.message}`, {
          id: "upload-toast",
          duration: 5000,
        });
      } finally {
        setIsUploading(false);
      }
    } else if (uploadType === "video") {
      // New secure direct upload flow for videos
      if (!fileSelected) {
        toast.error("Please select a video file to upload");
        return;
      }
      if (!title.trim()) {
        toast.error("Please enter a title for your video");
        return;
      }
      if (!description.trim()) {
        toast.error("Please write a description for your video");
        return;
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadStage('requesting');

      toast.loading("Requesting upload URL...", {
        id: "upload-toast",
        duration: Infinity,
      });

      try {
        // Step 1: Request upload URL from server with content validation (keeps API key secure)
        // Server checks for blocked keywords BEFORE allowing upload to save time and bandwidth
        const urlResponse = await fetch(`${config.url}/api/requestVideoUploadUrl`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            fileName: fileSelected.name,
            fileSize: fileSelected.size,
            title: title.trim(),
            description: description.trim(),
            tags: tags,
          }),
        });

        if (!urlResponse.ok) {
          const errorData = await urlResponse.json().catch(() => ({ message: "Failed to get upload URL." }));
          throw new Error(errorData.message || "Failed to get upload URL from server.");
        }

        const urlResult = await urlResponse.json();
        if (!urlResult.success || !urlResult.uploadUrl || !urlResult.uid) {
          throw new Error("Invalid response from server when requesting upload URL.");
        }

        const { uploadUrl, uid: cloudflareStreamId } = urlResult;

        setUploadStage('uploading');
        toast.loading("Uploading video...", {
          id: "upload-toast",
          duration: Infinity,
        });

        await new Promise((resolve, reject) => {
          const upload = new tus.Upload(fileSelected, {
            endpoint: uploadUrl,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            chunkSize: 50 * 1024 * 1024, // 50 MB chunks
            metadata: {
              filename: fileSelected.name,
              filetype: fileSelected.type || 'video/mp4',
            },
            onError(error) {
              console.error('[CLIENT] TUS upload failed:', error);
              reject(error);
            },
            onProgress(bytesUploaded, bytesTotal) {
              const percent = Math.round((bytesUploaded / bytesTotal) * 100);
              setUploadProgress(percent);
              
              const uploadedMB = (bytesUploaded / (1024 * 1024)).toFixed(1);
              const totalMB = (bytesTotal / (1024 * 1024)).toFixed(1);
              
              toast.loading(`Uploading: ${percent}% (${uploadedMB}MB / ${totalMB}MB)`, {
                id: "upload-toast",
                duration: Infinity,
              });
            },
            onSuccess() {
              resolve();
            },
          });

          setCurrentUpload(upload);
          upload.start();
        });

        setUploadStage('completing');
        setUploadProgress(100);
        toast.loading("Finalizing upload...", {
          id: "upload-toast",
          duration: Infinity,
        });

        const completeFormData = new FormData();
        completeFormData.append("token", token);
        completeFormData.append("cloudflareStreamId", cloudflareStreamId);
        completeFormData.append("title", title);
        completeFormData.append("description", description);
        completeFormData.append("tags", tags);
        if (videoDuration !== null) {
          completeFormData.append("duration", videoDuration.toString());
        }
        if (thumbnailFile) {
          completeFormData.append("thumbnailFile", thumbnailFile);
        }

        const completeResponse = await fetch(`${config.url}/api/completeVideoUpload`, {
          method: "POST",
          body: completeFormData,
        });

        if (!completeResponse.ok) {
          const errorData = await completeResponse.json().catch(() => ({ message: "Failed to complete upload." }));
          throw new Error(errorData.message || "Failed to finalize upload on server.");
        }

        const completeResult = await completeResponse.json();

        if (completeResult.success) {

          toast.success("Video uploaded successfully! Processing...", {
            id: "upload-toast",
            duration: 3000,
          });
          setTimeout(() => {
            router.push("/");
          }, 1000);
        } else {
          throw new Error(completeResult.message || "Failed to complete upload.");
        }
      } catch (error) {
        console.error('[CLIENT] Upload failed:', error);
        toast.error(`Upload failed: ${error.message}`, {
          id: "upload-toast",
          duration: 5000,
        });
        
        if (currentUpload) {
          try {
            currentUpload.abort();
          } catch (abortError) {
            console.error('[CLIENT] Error aborting upload:', abortError);
          }
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setCurrentUpload(null);
      }
    }
  };

  return (
    <div className="min-h-screen py-6 md:py-7 mb-12">
      {/* Header */}
      <div className="max-w-[79rem] mx-auto px-4 mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <TypeIcon className="text-[#ea4197] text-2xl" />
            <h1 className="text-2xl font-semibold text-white">
              {pageTitle}
            </h1>
          </div>
          <Link
            href="/"
            className="sm:flex hidden items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <RiArrowGoBackLine className="text-base" />
            Back
          </Link>
        </div>
        <p className="text-white/50 text-sm">
          {uploadType === "photo"
            ? "Share your photos with the community"
            : "Share your videos with the community"}
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-[79rem] mx-auto px-4">
        {/* Upload Type Switcher - Mobile Only */}
        <div className="md:hidden mb-4">
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (uploadType !== "photo") {
                    resetFormData();
                    router.push("/upload?type=photo");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center cursor-pointer ${
                  uploadType === "photo"
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <RiImageAddLine className="text-base" />
                Photo
              </button>
              <button
                onClick={() => {
                  if (uploadType !== "video") {
                    resetFormData();
                    router.push("/upload?type=video");
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center cursor-pointer ${
                  uploadType === "video"
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <RiVideoAddLine className="text-base" />
                Video
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Preview */}
          <div className="space-y-4">
            {/* Desktop Upload Type Switcher */}
            <div className="hidden md:block bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (uploadType !== "photo") {
                      resetFormData();
                      router.push("/upload?type=photo");
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    uploadType === "photo"
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <RiImageAddLine className="text-base" />
                  Photo
                </button>
                <button
                  onClick={() => {
                    if (uploadType !== "video") {
                      resetFormData();
                      router.push("/upload?type=video");
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    uploadType === "video"
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                >
                  <RiVideoAddLine className="text-base" />
                  Video
                </button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl py-4 px-5 md:py-6 md:px-6">
              <div
                className={`
                  relative aspect-video rounded-lg overflow-hidden
                  ${
                    !filePreview
                      ? "border-2 border-dashed border-white/10 bg-[#0d0d0d] hover:border-[#ea4197]/50 cursor-pointer transition-all"
                      : "border border-[#1a1a1a] bg-[#0a0a0a]"
                  }
                  ${
                    isDragging && !filePreview
                      ? "border-[#ea4197] bg-[#0a0a0a]"
                      : ""
                  }
                `}
                onClick={() => !filePreview && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {filePreview ? (
                  <>
                    {uploadType === "photo" ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <video
                        src={filePreview}
                        controls
                        className="w-full h-full object-contain"
                      >
                        Your browser does not support the video tag.
                      </video>
                    )}

                    <div className="absolute right-3 top-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          replaceInputRef.current?.click();
                        }}
                        className="bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white py-2 px-4 rounded-lg transition-all text-sm font-medium border border-white/10 cursor-pointer"
                      >
                        Replace
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col cursor-pointer items-center justify-center h-full p-6 text-center">
                    <TypeIcon className="text-white/20 text-5xl mb-4" />
                    <h3 className="text-base font-medium text-white mb-2">
                      {uploadType === "photo"
                        ? "Click or drag to upload photos"
                        : "Click or drag to upload a video"}
                    </h3>
                    <p className="text-white/40 text-sm mb-6">
                      {uploadType === "photo"
                        ? "JPG, PNG, GIF, WebP up to 30MB"
                        : "MP4, WebM, MOV up to 1GB"}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#f7f7f7] cursor-pointer text-black hover:bg-white/90 py-2 px-6 rounded-lg transition-all text-sm font-medium"
                    >
                      Select File
                    </button>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple={uploadType === "photo"}
                accept={uploadType === "photo" ? "image/*" : "video/*"}
                onChange={handleFileChange}
                className="hidden"
              />

              <input
                ref={replaceInputRef}
                type="file"
                accept={uploadType === "photo" ? "image/*" : "video/*"}
                onChange={handleFileReplace}
                className="hidden"
              />
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl py-4 px-5 md:py-7 md:px-6">
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="title"
                  className="block text-white/70 mb-2 text-sm font-medium"
                >
                  Title <span className="text-[#ea4197]">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder={`Enter a title for your ${uploadType}`}
                  className="w-full bg-[#0a0a0a] text-white py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 hover:border-white/20 transition-all placeholder:text-white/30"
                  required
                  maxLength={TITLE_MAX_LENGTH}
                />
                <div className="flex justify-end mt-1.5">
                  <span
                    className={`text-xs ${
                      title.length >= TITLE_MAX_LENGTH * 0.9
                        ? "text-[#ea4197]"
                        : "text-white/40"
                    }`}
                  >
                    {title.length}/{TITLE_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-white/70 mb-2 text-sm font-medium"
                >
                  Description <span className="text-[#ea4197]">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="Tell viewers about your content..."
                  rows={4}
                  className="w-full bg-[#0a0a0a] text-white py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 hover:border-white/20 transition-all resize-none placeholder:text-white/30"
                  maxLength={DESCRIPTION_MAX_LENGTH}
                />
                <div className="flex justify-end mt-1.5">
                  <span
                    className={`text-xs ${
                      description.length >= DESCRIPTION_MAX_LENGTH * 0.9
                        ? "text-[#ea4197]"
                        : "text-white/40"
                    }`}
                  >
                    {description.length}/{DESCRIPTION_MAX_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="tags"
                  className="block text-white/70 mb-2 text-sm font-medium"
                >
                  Tags <span className="text-white/40 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={handleTagsChange}
                  placeholder="e.g. sexy hot boobs etc."
                  className="w-full bg-[#0a0a0a] text-white py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 hover:border-white/20 transition-all placeholder:text-white/30"
                />
                <div className="flex justify-end mt-1.5">
                  <span
                    className={`text-xs ${
                      tags.split(" ").filter((tag) => tag !== "").length >=
                      MAX_TAGS * 0.9
                        ? "text-[#ea4197]"
                        : "text-white/40"
                    }`}
                  >
                    {tags.split(" ").filter((tag) => tag !== "").length}/
                    {MAX_TAGS} tags
                  </span>
                </div>
              </div>

              {uploadType === "video" && (
                <div>
                  <label
                    htmlFor="thumbnail"
                    className="block text-white/70 mb-2 text-sm font-medium"
                  >
                    Thumbnail <span className="text-white/40 font-normal">(optional)</span>
                  </label>
                  <div className="border border-white/10 rounded-lg p-4 bg-[#0a0a0a]">
                    {!thumbnailFile && (
                      <p className="text-sm text-white/50 mb-3">
                        A thumbnail will be generated automatically, or upload a custom one
                      </p>
                    )}

                    {thumbnailFile ? (
                      <div className="mb-3 flex items-center space-x-3">
                        <div className="relative w-24 h-14 bg-[#0a0a0a] border border-white/10 rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={URL.createObjectURL(thumbnailFile)}
                            alt="Thumbnail preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-400 font-medium flex items-center mb-1">
                            <span className="inline-block mr-1">✓</span> Custom
                            thumbnail selected
                          </p>
                          <p className="text-xs text-white/40 truncate">
                            {thumbnailFile.name}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-2">
                    <button
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="bg-white/10 hover:bg-white/15 text-white py-2 px-4 rounded-lg transition-all text-sm font-medium border border-white/10 cursor-pointer"
                    >
                      {thumbnailFile ? "Change" : "Upload Thumbnail"}
                    </button>

                    {thumbnailFile && (
                      <button
                        onClick={() => setThumbnailFile(null)}
                        className="bg-transparent hover:bg-white/5 text-white/60 hover:text-white py-2 px-4 rounded-lg transition-all text-sm font-medium cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                    </div>

                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {uploadType === "photo" && galleryFiles.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-white/70 text-sm font-medium">
                      Gallery Images ({galleryFiles.length}/{MAX_GALLERY_FILES})
                    </label>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-white/10 hover:bg-white/15 text-white py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 font-medium border border-white/10 cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add More
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {galleryFiles.map((file, index) => (
                      <div 
                        key={index} 
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border ${
                          selectedThumbnailIndex === index 
                            ? 'border-[#ea4197] ring-1 ring-[#ea4197]/50' 
                            : 'border-white/10 hover:border-white/30'
                        } transition-all duration-150`}
                        onClick={() => {
                          setFileSelected(file);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setFilePreview(reader.result);
                          };
                          reader.readAsDataURL(file);
                          setSelectedThumbnailIndex(index);
                        }}
                      >
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Gallery image ${index+1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newFiles = [...galleryFiles];
                            newFiles.splice(index, 1);
                            setGalleryFiles(newFiles);
                            
                            if (selectedThumbnailIndex === index) {
                              if (newFiles.length > 0) {
                                setSelectedThumbnailIndex(0);
                                setFileSelected(newFiles[0]);
                                const reader = new FileReader();
                                reader.onload = () => {
                                  setFilePreview(reader.result);
                                };
                                reader.readAsDataURL(newFiles[0]);
                              } else {
                                setSelectedThumbnailIndex(0);
                                setFileSelected(null);
                                setFilePreview(null);
                              }
                            } else if (selectedThumbnailIndex > index) {
                              setSelectedThumbnailIndex(selectedThumbnailIndex - 1);
                            }
                          }}
                          className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white rounded-full p-1 transition-all border border-white/20 cursor-pointer"
                        >
                          <RiCloseLine className="h-3.5 w-3.5" />
                        </button>
                        
                        {selectedThumbnailIndex === index && (
                          <div className="absolute bottom-1.5 left-1.5 bg-[#ea4197] text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                            Thumbnail
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {galleryFiles.length < MAX_GALLERY_FILES && (
                      <div 
                        className="aspect-square rounded-lg border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="text-[0.65rem] text-white/40 mt-1 px-1 text-center font-medium">Add</span>
                      </div>
                    )}
                  </div>
                  
                  {galleryFiles.length > 1 && (
                    <p className="mt-3 text-white/40 text-xs">
                      Click on an image to set it as the thumbnail
                    </p>
                  )}
                </div>
              )}

              {/* Upload Progress Bar - Only for video uploads */}
              {uploadType === "video" && isUploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/70 font-medium">
                      {uploadStage === 'uploading' ? 'Uploading to Server...' : 
                       uploadStage === 'completing' ? 'Finalizing...' : 
                       'Processing...'}
                    </span>
                    {/* <span className="text-[#ea4197] font-semibold">{uploadProgress}%</span> */}
                  </div>
                  <div className="w-full bg-[#0a0a0a] rounded-full h-3 overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ea4197] to-[#d4357a] transition-all duration-300 ease-out rounded-full relative overflow-hidden"
                      style={{ width: `${uploadProgress}%` }}
                    >
                      {/* Animated shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                    {/* <div className="w-1.5 h-1.5 rounded-full bg-[#ea4197] animate-pulse"></div> */}
                    <span>Please keep this page open until upload completes</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={isUploading || !isUploadReady()}
                className={`
                  w-full py-2.5 px-6 rounded-lg flex items-center cursor-pointer justify-center font-medium text-sm
                  ${
                    isUploading
                      ? "bg-white/10 text-white/50 cursor-not-allowed"
                      : isUploadReady()
                      ? "bg-[#ea4197] text-white hover:bg-[#ea4197]/90 transition-all duration-200"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }
                `}
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin mr-2"></div>
                    {uploadType === "video" && uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : "Uploading..."}
                  </>
                ) : (
                  <>
                    <RiUpload2Line size={18} className="mr-2" />
                    Upload {uploadType === "photo" ? "Photos" : "Video"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const UploadPage = () => {
  return (
    <Suspense fallback={<UploadPageLoading />}>
      <UploadPageContent />
    </Suspense>
  );
};

export default UploadPage;
