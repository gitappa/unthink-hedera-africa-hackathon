import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Plus, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useFileUpload } from '../hooks';

interface PhotoUploadProps {
  onPhotoSelected: (urls: string[]) => void;
  mandatory?: boolean;
  store?: string;
}

interface FilePreview {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  progress: number;
  error?: string;
}

const PhotoUpload = ({ onPhotoSelected, store }: PhotoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, error } = useFileUpload();
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploadedBefore, setHasUploadedBefore] = useState(false);

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file';
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const createFilePreview = (file: File): Promise<FilePreview> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        resolve({
          id: `${file.name}-${Date.now()}`,
          file,
          preview,
          uploading: false,
          progress: 0
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    // Create preview for the file
    const filePreview = await createFilePreview(file);
    setSelectedFiles(prev => [...prev, filePreview]);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadAllFiles = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // Upload files in order
      for (let i = 0; i < selectedFiles.length; i++) {
        const filePreview = selectedFiles[i];
        
        // Update progress for this file
        setSelectedFiles(prev => prev.map(file => 
          file.id === filePreview.id 
            ? { ...file, uploading: true, progress: 0 }
            : file
        ));

        // Upload file
        const uploadedUrl = await uploadFile(filePreview.file, store);
        
        if (uploadedUrl) {
          uploadedUrls.push(uploadedUrl);
          
          // Update progress to 100%
          setSelectedFiles(prev => prev.map(file => 
            file.id === filePreview.id 
              ? { ...file, uploading: false, progress: 100 }
              : file
          ));
        } else {
          // Mark as error
          setSelectedFiles(prev => prev.map(file => 
            file.id === filePreview.id 
              ? { ...file, uploading: false, error: 'Upload failed' }
              : file
          ));
        }
      }

      if (uploadedUrls.length > 0) {
        onPhotoSelected(uploadedUrls);
        // Clear selected files after successful upload
        setSelectedFiles([]);
        setHasUploadedBefore(true);
      }
    } finally {
      setIsUploading(false);
    }
  };


  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {error && (
        <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Image Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((filePreview, index) => (
              <div key={filePreview.id} className="relative">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={filePreview.preview} 
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {filePreview.uploading && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center gap-1">
                      <div className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <div className="text-white text-[10px] leading-none">{filePreview.progress}%</div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(filePreview.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  disabled={filePreview.uploading}
                >
                  <X className="w-3 h-3" />
                </button>
                {filePreview.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
                    <span className="text-white text-xs">Error</span>
                  </div>
                )}
              </div>
            ))}
            
                         {/* Add more button */}
             <button
               onClick={handleFileSelect}
               disabled={isUploading}
               className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50"
             >
               <Plus className="w-6 h-6 text-gray-400" />
             </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={selectedFiles.length > 0 ? uploadAllFiles : handleFileSelect}
          disabled={isUploading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
        >
          {selectedFiles.length > 0 ? (
            <Upload className="w-4 h-4" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
          <span>
            {isUploading 
              ? 'Uploading...' 
              : selectedFiles.length > 0 
                ? `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}` 
                : hasUploadedBefore 
                  ? 'Update Photo' 
                  : 'Add Photo'
            }
          </span>
        </button>
      </div>
    </div>
  );
};

export default PhotoUpload;