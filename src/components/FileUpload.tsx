import React, { useState, useRef } from "react";
import { File as FileIcon, X, Image as ImageIcon, Video } from "lucide-react";
import Image from "next/image";

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  maxSizeMB?: number;
  acceptedTypes?: string;
  uniqueId: string;
  existingFile?: File;
}

export default function FileUpload({ 
  onFileChange, 
  maxSizeMB = 50,
  acceptedTypes = "image/*,video/*",
  uniqueId,
  existingFile
}: FileUploadProps) {
  const [preview, setPreview] = useState<{
    type: "image" | "video" | "other";
    url: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (existingFile) {
      handleFilePreview(existingFile);
    }
    // Cleanup function to revoke object URLs
    return () => {
      if (preview?.url && !preview.url.startsWith('data:')) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [existingFile]);

  const handleFilePreview = async (file: File) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      const isOther = !isVideo && !isImage;

      if (isImage || isVideo) {
        // Use URL.createObjectURL instead of FileReader for better performance
        const objectUrl = URL.createObjectURL(file);
        setPreview({
          type: isVideo ? "video" : "image",
          url: objectUrl,
          name: file.name
        });
      } else if (isOther) {
        setPreview({
          type: "other",
          url: "",
          name: file.name
        });
      }
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      alert(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    handleFilePreview(file);
    onFileChange(file);
  };

  const removeFile = () => {
    if (preview?.url && !preview.url.startsWith('data:')) {
      URL.revokeObjectURL(preview.url);
    }
    onFileChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      {preview ? (
        <div className="relative w-full h-64 bg-background rounded-lg border-2 border-border">
          {preview.type === "image" ? (
            <div className="relative w-full h-full">
              <img
                src={preview.url}
                alt={preview.name}
                className="rounded-lg p-2 object-contain w-full h-full"
              />
            </div>
          ) : preview.type === "video" ? (
            <video
              src={preview.url}
              controls
              className="w-full h-full rounded-lg object-contain p-2"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">{preview.name}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={removeFile}
            className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/90 transition-colors"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <label
          htmlFor={`file-upload-${uniqueId}`}
          className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-background hover:bg-accent transition-colors"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <div className="flex space-x-2 mb-3">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="mb-2 text-sm">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              Images and Videos (Max {maxSizeMB}MB)
            </p>
          </div>
        </label>
      )}
      <input
        type="file"
        id={`file-upload-${uniqueId}`}
        accept={acceptedTypes}
        onChange={handleFileChange}
        className="hidden"
        ref={fileInputRef}
        disabled={isProcessing}
      />
    </div>
  );
} 