import React, { useRef, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { eventApi } from "../services/api";
import PhotoUpload from './PhotoUpload';
import type { JSX } from 'react/jsx-runtime';

// Enhanced markdown renderer for comprehensive formatting
const renderMarkdown = (text: string) => {
  // Split by lines and process each line
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, index) => {
    if (line.trim() === '') {
      // Empty line - add line break
      elements.push(<br key={`br-${index}`} />);
      return;
    }

    // Check if line starts with bullet point
    const isBulletPoint = line.trim().startsWith('- ');
    const content = isBulletPoint ? line.trim().substring(2) : line;

    // Process bold text (*text*)
    const processedContent = content.split(/(\*[^*]+\*)/).map((part, partIndex) => {
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <strong key={`bold-${index}-${partIndex}`}>{part.slice(1, -1)}</strong>;
      }
      return part;
    });

    if (isBulletPoint) {
      elements.push(
        <div key={`bullet-${index}`} className="flex items-start gap-2 mb-1">
          <span className="text-gray-600 mt-0.5">•</span>
          <span>{processedContent}</span>
        </div>
      );
    } else {
      elements.push(
        <div key={`line-${index}`} className="mb-1">
          {processedContent}
        </div>
      );
    }
  });

  return <div>{elements}</div>;
};

interface ImagePostProps {
  imageUrl?: string;
  name?: string;
  templateType?: 'image_text_template' | 'image_template' | 'text_template';
  templateValue?: {
    bg_image: string;
    type: string;
    image_coordinates?: Array<{ point: [number, number]; radius: number }>;
    text_coordinates?: Array<{ point: [number, number] }>;
  };
  message?: string;
  response_message?: string;
  onDataCollected?: (data: { images: string[]; texts: string[] }) => void;
  questionKey?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  file: File;
}

const ImagePost: React.FC<ImagePostProps> = ({ 
  imageUrl: propImageUrl, 
  name: propName, 
  templateType = 'image_text_template',
  templateValue,
  message,
  response_message,
  onDataCollected,
  questionKey
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { eventId } = useParams<{ eventId: string }>();
  const [backgroundImage, setBackgroundImage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [textInputs, setTextInputs] = useState<string[]>([]);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const [notificationLink, setNotificationLink] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState<number>(0.3);

  useEffect(() => {
    const fetchEventData = async () => {
      setIsLoading(true);
      try {
        if (eventId) {
          const data = await eventApi.getEventById(eventId);
          const badgeTemplateData = data.admin_details.find(item => item.key === "badge_template");
          const badgeValue = badgeTemplateData?.value || null;

          // Set notification message and link
          if (badgeValue && typeof badgeValue === 'object' && 'notification_message' in badgeValue) {
            const notificationMsg = (badgeValue as any).notification_message;
            if (typeof notificationMsg === 'string') {
              setNotificationMessage(notificationMsg);
            }
          }
          if (badgeValue && typeof badgeValue === 'object' && 'link' in badgeValue) {
            const link = (badgeValue as any).link;
            if (typeof link === 'string') {
              const fullLink = `${window.location.origin}/${link}`;
              setNotificationLink(fullLink);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching event data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventData();
  }, [propImageUrl, propName, location.state, eventId]);

  useEffect(() => {
    if (templateValue?.bg_image) {
      setBackgroundImage(templateValue.bg_image);
    }
  }, [templateValue]);

  const handleImageUpload = (urls: string[]) => {
    // Convert URLs to UploadedImage objects
    const newImages: UploadedImage[] = urls.map((url, index) => ({
      id: `img-${Date.now()}-${index}`,
      url: url,
      file: new File([], `image-${index}.jpg`) // Placeholder file object
    }));
    
    // Only take first n images where n is the number of image_coordinates
    const maxImages = templateValue?.image_coordinates?.length || 0;
    const limitedImages = newImages.slice(0, maxImages);
    
    setUploadedImages(limitedImages);
  };


  const handleTextInput = (index: number, value: string) => {
    const newTextInputs = [...textInputs];
    newTextInputs[index] = value;
    setTextInputs(newTextInputs);
  };

  const handleShowPreview = () => {
    setShowPreview(true);
    
    // Collect data and send to parent when preview is shown
    const collectedData = {
      images: uploadedImages.map(img => img.url),
      texts: textInputs.filter(text => text && text.trim() !== '')
    };
    
    console.log('=== IMAGE POST DATA COLLECTION ===');
    console.log('Question Key:', questionKey);
    console.log('Template Type:', templateType);
    console.log('Collected Images:', collectedData.images);
    console.log('Collected Texts:', collectedData.texts);
    console.log('================================');
    
    if (onDataCollected) {
      onDataCollected(collectedData);
    }
  };

  const canProceedToPreview = () => {
    if (templateType === 'image_template') return uploadedImages.length > 0;
    if (templateType === 'text_template') return textInputs.every(text => text && text.trim() !== '');
    return uploadedImages.length > 0 && textInputs.every(text => text && text.trim() !== '');
  };

  const CardPreview: React.FC<{ children: React.ReactNode; scale?: number }> = ({ children, scale = 0.3 }) => (
    <div style={{
      width: '1080px',
      height: '1920px',
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
    }}>
      {children}
    </div>
  );

  // Responsively compute preview scale so it fits within available width (especially on mobile)
  useEffect(() => {
    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const containerWidth = previewContainerRef.current.clientWidth;
      if (!containerWidth) return;
      const maxScale = 0.3; // desktop scale cap to preserve design
      const scaleByWidth = containerWidth / 1080; // design width
      const nextScale = Math.min(maxScale, scaleByWidth);
      setPreviewScale(nextScale);
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [showPreview]);

  const renderMessageStep = () => {
    return (
      <div className="mb-3">
        {message ? renderMarkdown(message) : <p>Please provide the required information</p>}
      </div>
    );
  };

  const renderImageUploadStep = () => {
    if (templateType === 'text_template') return null;

    return (
      <div className="mb-3">
        <PhotoUpload
          onPhotoSelected={handleImageUpload}
          mandatory={templateType === 'image_template'}
        />
        
        {uploadedImages.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-2">Uploaded Images:</h4>
            <div className="grid grid-cols-2 gap-2">
              {uploadedImages.map((img, index) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.url}
                    alt={`Uploaded ${index + 1}`}
                    className="w-full h-20 object-cover rounded"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTextInputStep = () => {
    if (templateType === 'image_template') return null;

    const maxTexts = templateValue?.text_coordinates?.length || 0;
    
    return (
      <div className="mb-3">
        {Array.from({ length: maxTexts }, (_, index) => (
          <div key={index} className="mb-2">
            <input
              type="text"
              value={textInputs[index] || ''}
              onChange={(e) => handleTextInput(index, e.target.value)}
              placeholder={`Enter your text input`}
              className="w-full p-2 border border-gray-300 bg-white rounded text-sm"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderShowPreviewButton = () => {
    return (
      <div className="mb-4 p-3 rounded-lg max-w-sm mx-auto">
        <button
          onClick={handleShowPreview}
          disabled={!canProceedToPreview()}
          className="w-full px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
        >
          Show Preview
        </button>
      </div>
    );
  };

  const renderPreviewStep = () => {
    if (!showPreview) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-center">Preview</h3>
        <div ref={previewContainerRef} style={{ width: '100%', maxWidth: '100%', margin: '0 auto', overflow: 'hidden' }}>
          <div style={{ width: `${1080 * previewScale}px`, height: `${1920 * previewScale}px`, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', margin: '0 auto' }}>
            <CardPreview scale={previewScale}>
            <div
              ref={cardRef}
              style={{
                width: '1080px',
                height: '1920px',
                backgroundImage: isLoading ? 'none' : `url(${backgroundImage})`,
                backgroundColor: isLoading ? '#ccc' : '#000',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
                position: 'relative'
              }}
            >
              {isLoading ? (
                <p style={{ color: 'white', fontSize: '40px' }}>Loading Template...</p>
              ) : (
                <>
                  {/* Render uploaded images at coordinates */}
                  {templateValue?.image_coordinates?.map((coord, index) => {
                    if (uploadedImages[index]) {
                      const [x, y] = coord.point;
                      const radius = coord.radius;
                      
                      return (
                        <div
                          key={`img-${index}`}
                          style={{
                            position: 'absolute',
                            left: `${x - radius}px`,
                            top: `${y - radius}px`,
                            width: `${radius * 2}px`,
                            height: `${radius * 2}px`,
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '2px solid white',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                          }}
                        >
                          <img
                            src={uploadedImages[index].url}
                            alt={`Uploaded ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      );
                    }
                    return null;
                  })}

                  {/* Render text inputs at coordinates */}
                  {templateValue?.text_coordinates?.map((coord, index) => {
                    if (textInputs[index]) {
                      const [x, y] = coord.point;
                      
                      return (
                        <div
                          key={`text-${index}`}
                          style={{
                            position: 'absolute',
                            left: `${x}px`,
                            top: `${y}px`,
                            transform: 'translate(-50%, -50%)',
                            color: 'white',
                            fontSize: '80px',
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                            overflow: 'visible'
                          }}
                        >
                          {textInputs[index]}
                        </div>
                      );
                    }
                    return null;
                  })}
                </>
              )}
              </div>
            </CardPreview>
          </div>
        </div>
      </div>
    );
  };

  const renderResponseMessage = () => {
    if (!showPreview || !response_message || !response_message.trim()) return null;

    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg max-w-sm mx-auto">
        <div className="text-sm leading-relaxed text-blue-800">
          {renderMarkdown(response_message)}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Step 1: Message */}
      {renderMessageStep()}

      {/* Step 2: Image Upload */}
      {renderImageUploadStep()}

      {/* Step 3: Text Input */}
      {renderTextInputStep()}

      {/* Show Preview Button - Outside message bubble */}
      {renderShowPreviewButton()}

      {/* Step 4: Preview */}
      {renderPreviewStep()}

      {/* Step 5: Response Message */}
      {renderResponseMessage()}

      {/* Notification Message Box */}
      {(notificationMessage) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 shadow-md max-w-sm mx-auto">
          <p className="mb-2 text-sm leading-relaxed text-gray-800 font-medium">
            {notificationMessage}
          </p>
          <div className="text-center">
            <a
              href={notificationLink || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-orange-600 underline text-sm font-medium"
            >
              link
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePost;
