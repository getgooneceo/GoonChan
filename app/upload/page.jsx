"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  RiImageAddLine,
  RiVideoAddLine,
  RiUpload2Line,
  RiArrowGoBackLine,
} from "react-icons/ri";
import Link from "next/link";
import { Toaster, toast } from "sonner";
import NavBar from "@/components/NavBar";

const UploadPage = ({ user }) => {
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);

  const fileInputRef = React.useRef(null);
  const thumbnailInputRef = React.useRef(null);

  const pageTitle = uploadType === "photo" ? "Upload Photo" : "Upload Video";
  const TypeIcon = uploadType === "photo" ? RiImageAddLine : RiVideoAddLine;

  const resetFormData = () => {
    setFilePreview(null);
    setFileSelected(null);
    setTitle("");
    setDescription("");
    setTags("");
    setIsUploading(false);
    setUploadProgress(0);
    setIsDragging(false);
    setThumbnailFile(null);
  };

  useEffect(() => {
    resetFormData();
  }, [uploadType]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (uploadType === "photo" && !file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (uploadType === "video" && !file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    setFileSelected(file);

    const reader = new FileReader();
    reader.onload = () => {
      setFilePreview(reader.result);
    };
    reader.readAsDataURL(file);
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
    toast.success("Thumbnail selected successfully");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      if (uploadType === "photo" && !file.type.startsWith("image/")) {
        toast.error("Please drop an image file");
        return;
      }

      if (uploadType === "video" && !file.type.startsWith("video/")) {
        toast.error("Please drop a video file");
        return;
      }

      setFileSelected(file);

      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
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

  const handleUpload = async () => {
    if (!fileSelected || !title || !description) {
      toast.error("Please select a file and add a title and description");
      return;
    }

    setIsUploading(true);

    toast.loading("Uploading your content...", {
      id: "upload-toast",
    });

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 150);

    try {
      console.log("Uploading main file:", fileSelected);
      if (thumbnailFile) {
        console.log("Uploading custom thumbnail:", thumbnailFile);
      }

      // Simulating server upload delay
      await new Promise((resolve) => setTimeout(resolve, 3000));

      clearInterval(interval);
      setUploadProgress(100);

      toast.success("Upload successful!", {
        id: "upload-toast",
      });

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      console.error("Upload failed:", error);
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress(0);

      toast.error("Upload failed: " + error.message, {
        id: "upload-toast",
      });
    }
  };

  return (
    <div className="md:py-14 py-7">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* <NavBar user={user} showCategories={false} /> */}

      <div className="mb-8 max-w-[79rem] lg:px-0 px-4 mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="md:text-3xl text-2xl font-bold text-white flex items-center">
            <TypeIcon className="mr-3 text-[#ea4197] sm:text-4xl text-3xl" />
            {pageTitle}
          </h1>
          <Link
            href="/"
            className="flex items-center text-[#cccccc] hover:text-white transition-colors"
          >
            <RiArrowGoBackLine className="mr-2" />
            Back
          </Link>
        </div>
        <p className="text-[#a0a0a0] text-sm sm:text-base mt-1.5 sm:mt-2">
          {uploadType === "photo"
            ? "Share your photos with the GoonChan community"
            : "Share your videos with the GoonChan community"}
        </p>
      </div>

      <div className="max-w-[79rem] lg:px-0 px-3 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div
            className={`
              relative aspect-video rounded-xl overflow-hidden
              ${
                !filePreview
                  ? "border-2 border-dashed border-[#3a3a3a] bg-[#1a1a1a] hover:border-[#ea4197] cursor-pointer transition-colors"
                  : ""
              }
              ${
                isDragging && !filePreview
                  ? "border-[#ea4197] bg-[#1e1e1e]"
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
                    className="w-full h-full object-contain bg-[#1a1a1a]"
                  />
                ) : (
                  <video
                    src={filePreview}
                    controls
                    className="w-full h-full object-contain bg-[#1a1a1a]"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                <div className="absolute right-3 top-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="bg-[#2a2a2a] font-inter hover:bg-[#3a3a3a] text-[#f9f9f9] py-2 px-4 rounded-full transition-colors text-sm"
                  >
                    Replace
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <TypeIcon className="text-[#5a5a5a] sm:text-6xl text-7xl mb-2" />
                <h3 className="md:text-xl font-semibold text-white mb-1">
                  {uploadType === "photo"
                    ? "Click or drag to upload a photo"
                    : "Click or drag to upload a video"}
                </h3>
                <p className="text-[#a0a0a0] text-sm mb-4">
                  {uploadType === "photo"
                    ? "JPG, PNG, GIF, WebP up to 30MB"
                    : "MP4, WebM, MOV up to 1GB"}
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white py-2 px-6 rounded-full transition-colors"
                >
                  Select File
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={uploadType === "photo" ? "image/*" : "video/*"}
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="md:mt-6 mt-3.5 p-4 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]">
            <h3 className="text-white font-medium mb-3">Switch Upload Type</h3>
            <div className="grid grid-cols-2 gap-3 font-inter font-medium">
              <button
                onClick={() => {
                  if (uploadType !== "photo") {
                    resetFormData();
                    router.push("/upload?type=photo");
                  }
                }}
                className={`flex items-center cursor-pointer justify-center md:p-3 p-[10px] rounded-lg transition-colors ${
                  uploadType === "photo"
                    ? "bg-[#e42a8a] text-white"
                    : "bg-[#2a2a2a] text-[#cccccc] hover:bg-[#3a3a3a] hover:text-white"
                }`}
              >
                <RiImageAddLine className="mr-2 text-lg" />
                Photo
              </button>
              
              <button
                onClick={() => {
                  if (uploadType !== "video") {
                    resetFormData();
                    router.push("/upload?type=video");
                  }
                }}
                className={`flex items-center cursor-pointer justify-center md:p-3 p-[10px] rounded-lg transition-colors ${
                  uploadType === "video"
                    ? "bg-[#e42a8a] text-white"
                    : "bg-[#2a2a2a] text-[#cccccc] hover:bg-[#3a3a3a] hover:text-white"
                }`}
              >
                <RiVideoAddLine className="mr-2 text-lg" />
                Video
              </button>
            </div>
          </div>
        </div>
        <div className="bg-[#1a1a1a] md:p-[26px] p-[24px] rounded-xl border border-[#2a2a2a]">
          <h2 className="text-xl font-semibold text-white mb-5">
            Upload Details
          </h2>

          <div className="space-y-1">
            <div>
              <label
                htmlFor="title"
                className="block text-[#cccccc] mb-2 text-sm"
              >
                Title <span className="text-[#ea4197]">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={handleTitleChange}
                placeholder={`Enter a title for your ${uploadType}`}
                className="w-full bg-[#101010] text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4197] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
                required
                maxLength={TITLE_MAX_LENGTH}
              />
              <div className="flex justify-end mt-1.5">
                <span
                  className={`text-xs ${
                    title.length >= TITLE_MAX_LENGTH * 0.9
                      ? "text-[#ea4197]"
                      : "text-[#707070]"
                  }`}
                >
                  {title.length}/{TITLE_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-[#cccccc] mb-2 text-sm"
              >
                Description <span className="text-[#ea4197]">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Tell viewers about your content..."
                rows={5}
                className="w-full bg-[#101010] text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4197] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all resize-none"
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
              <div className="flex justify-end mt-1.5">
                <span
                  className={`text-xs ${
                    description.length >= DESCRIPTION_MAX_LENGTH * 0.9
                      ? "text-[#ea4197]"
                      : "text-[#707070]"
                  }`}
                >
                  {description.length}/{DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="tags"
                className="block text-[#cccccc] mb-2 text-sm"
              >
                Tags (space separated)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={handleTagsChange}
                placeholder="e.g. funny cute gaming"
                className="w-full bg-[#101010] text-white py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4197] border border-[#2a2a2a] hover:border-[#3a3a3a] transition-all"
              />
              <div className="flex justify-end mt-1.5">
                <span
                  className={`text-xs ${
                    tags.split(" ").filter((tag) => tag !== "").length >=
                    MAX_TAGS * 0.9
                      ? "text-[#ea4197]"
                      : "text-[#707070]"
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
                  className="block text-[#cccccc] mb-2 text-sm"
                >
                  Thumbnail
                </label>
                <div className="border border-[#2a2a2a] rounded-lg p-4 bg-[#101010]">
                  {!thumbnailFile && (
                    <p className="text-sm text-[#a0a0a0] mb-3">
                      A thumbnail will be generated automatically, or you can
                      upload a custom one.
                    </p>
                  )}

                  {thumbnailFile ? (
                    <div className="mb-3 flex items-center space-x-3">
                      <div className="relative w-24 h-14 bg-[#151515] rounded overflow-hidden flex-shrink-0">
                        <img
                          src={URL.createObjectURL(thumbnailFile)}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#9ce67b] font-medium flex items-center mb-1">
                          <span className="inline-block mr-1">✓</span> Custom
                          thumbnail selected
                        </p>
                        <p className="text-xs text-[#a0a0a0] truncate">
                          {thumbnailFile.name}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => thumbnailInputRef.current?.click()}
                      className="bg-[#2a2a2a] cursor-pointer hover:bg-[#3a3a3a] text-white py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      {thumbnailFile ? "Change Thumbnail" : "Upload Thumbnail"}
                    </button>

                    {thumbnailFile && (
                      <button
                        onClick={() => setThumbnailFile(null)}
                        className="bg-[#2a2a2a40] cursor-pointer hover:bg-[#3a3a3a] text-[#cccccc] py-2 px-4 rounded-lg transition-colors text-sm"
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

            {/* Upload progress */}
            {isUploading && (
              <div>
                <div className="flex justify-between text-sm text-[#cccccc] mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#101010] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ea4197] to-[#f27a51] transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!fileSelected || !title || isUploading || !description}
              className={`
                w-full py-3 px-6 rounded-lg flex items-center justify-center font-medium text-base mt-4
                ${
                  !fileSelected || !title || isUploading
                    ? "bg-[#4a4a4a] text-[#a0a0a0] cursor-not-allowed"
                    : "bg-[#ea4197] hover:bg-[#f54da7] text-white transition-all duration-200"
                }
              `}
            >
              <RiUpload2Line size={20} className="mr-2" />
              {isUploading ? "Uploading..." : "Upload Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
