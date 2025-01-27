import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Cloud, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

export function FileUploader({
  onFilesSelected,
  isUploading = false,
  accept,
  maxFiles = 5,
  className,
}: FileUploaderProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept ? { 'accepted': accept.split(',') } : undefined,
    maxFiles,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer',
        isDragActive && 'border-primary bg-accent',
        isUploading && 'pointer-events-none opacity-60',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
        <input {...getInputProps()} />
        <Cloud className="h-6 w-6" />
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Uploading...</p>
          </>
        ) : (
          <>
            <p>Drag & drop files here, or click to select files</p>
            {accept && (
              <p className="text-xs text-muted-foreground">
                Accepted files: {accept}
              </p>
            )}
            {maxFiles > 1 && (
              <p className="text-xs text-muted-foreground">
                Up to {maxFiles} files
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
} 