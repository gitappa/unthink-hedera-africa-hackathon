import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '../types';
import { Loader2, Bot, User } from 'lucide-react';
import type { JSX } from 'react/jsx-runtime';
import BadgePreview from './BadgePreview';
import PhotoUpload from './PhotoUpload';
import ImagePost from './imagePost';
import PaymentDetails from './PaymentDetails';
import VirtualTryOnInline from './VirtualTryOnInline';

// Simple markdown renderer for basic formatting
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

interface ChatMessageProps {
  message: ChatMessageType;
  onPhotoUpload?: (urls: string[]) => void;
  onBooleanResponse?: (value: boolean) => void;
  onMultiSelectResponse?: (selected: string[]) => void;
  onSubmitRegistration?: () => void;
  onActionClick?: (action: string) => void;
  isProcessing?: boolean;
  onTemplateDataCollected?: (questionKey: string, data: { images: string[]; texts: string[] }) => void;
  currentQuestionKey?: string;
  nextQuestionKey?: string;
  onPaymentProceed?: (paymentLink: string) => void;
  hasPaymentDetails?: boolean;
  userId?: string;
  botImageUrl?: string | null;
  submitLabel?: string;
}

const ChatMessage = ({
  message,
  onPhotoUpload,
  onBooleanResponse,
  onMultiSelectResponse,
  onSubmitRegistration,
  onActionClick,
  isProcessing,
  onTemplateDataCollected,
  currentQuestionKey,
  nextQuestionKey,
  onPaymentProceed,
  hasPaymentDetails,
  userId,
  botImageUrl,
  submitLabel,
}: ChatMessageProps) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedBooleanValue, setSelectedBooleanValue] = useState<boolean | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const isBot = message.type === 'bot';
  const isPhotoRequest = message.inputType === 'upload';
  const isBooleanQuestion = message.inputType === 'boolean';
  const isMultiSelectQuestion = message.inputType === 'multiselect';
  const isSubmitRequest = message.inputType === 'submit';
  const isVirtualTryOn = message.inputType === 'virtual_tryon';

  // Don't render banner messages in chat (they're handled separately)
  if (message.type === 'banner') {
    return null;
  }

  const handlePhotoUpload = (urls: string[]) => {
    setIsAnswered(true);
    if (onPhotoUpload) {
      onPhotoUpload(urls);
    }
  };

  const handleSkip = () => {
    setIsAnswered(true);
    if (onPhotoUpload) {
      onPhotoUpload([]); // Pass empty array to indicate skip
    }
  };



  const handleBooleanClick = (value: boolean) => {
    setSelectedBooleanValue(value);
    setIsAnswered(true);
    if (onBooleanResponse) {
      onBooleanResponse(value);
    }
  };

  const handleOptionToggle = (option: string) => {
    if (isAnswered) return;

    const newSelected = selectedOptions.includes(option)
      ? selectedOptions.filter(item => item !== option)
      : [...selectedOptions, option];

    setSelectedOptions(newSelected);
  };

  const handleMultiSelectSubmit = () => {
    setIsAnswered(true);
    if (onMultiSelectResponse) {
      onMultiSelectResponse(selectedOptions);
    }
  };

  const isSelected = (option: string) => selectedOptions.includes(option);

  const handleActionClick = (action: string) => {
    console.log('=== ACTION CLICK DEBUG ===');
    console.log('Button clicked:', action);
    console.log('Message ID:', message.id);
    console.log('Message type:', message.type);
    console.log('Template type:', message.templateType);
    console.log('Is answered before click:', isAnswered);
    console.log('onActionClick function:', onActionClick ? 'exists' : 'missing');
    console.log('==========================');
    
    setSelectedAction(action);
    setIsAnswered(true);
    if (onActionClick) {
      onActionClick(action);
    }
  };



  // Check if this message has action buttons
  const hasActionButtons = message.action && message.action_type && 
    message.action.length > 0 && message.action_type.trim() !== '';

  // Special rendering for show_collection messages
  const renderShowCollectionMessage = () => {
    if (!message.isShowCollection || !message.collectionLink) {
      return null;
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700 leading-relaxed">{message.content}</p>
        <div className="flex items-center gap-3">
          <a 
            href={message.collectionLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-md transition-colors duration-200 hover:bg-blue-50"
          >
            <span>View Collection</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    );
  };

  // Special rendering for badge preview messages
  const renderBadgePreview = () => {
    if (!message.isBadgePreview || !message.badgeImageUrl || !message.badgeUserName) {
      return null;
    }

    return (
      <div className="space-y-3">
        <BadgePreview 
          imageUrl={message.badgeImageUrl} 
          name={message.badgeUserName} 
        />
        
        {/* Action buttons for badge preview */}
        {message.action && message.action_type && message.action.length > 0 && onActionClick && (
          <div className="flex gap-3">
            {message.action.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                disabled={isAnswered || isProcessing}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${selectedAction === action
                  ? 'bg-gray-300 border border-gray-400 text-gray-800'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
              >
                {isProcessing && selectedAction === action ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                <span>{action}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Handle template data collection
  const handleTemplateDataCollected = (data: { images: string[]; texts: string[] }) => {
    console.log('=== TEMPLATE DATA RECEIVED IN CHAT MESSAGE ===');
    console.log('Question Key:', currentQuestionKey);
    console.log('Data:', data);
    console.log('==============================================');
    
    if (onTemplateDataCollected && currentQuestionKey) {
      onTemplateDataCollected(currentQuestionKey, data);
    }
  };

  // Special rendering for template types (image_text_template, image_template, text_template)
  const renderTemplateMessage = () => {
    if (!message.templateType || !message.templateValue) {
      return null;
    }

    return (
      <div>
        <ImagePost
          templateType={message.templateType}
          templateValue={message.templateValue}
          message={message.content}
          response_message={message.response_message}
          onDataCollected={handleTemplateDataCollected}
          questionKey={currentQuestionKey}
        />
      </div>
    );
  };

  // Special rendering for payment details
  const renderPaymentDetails = () => {
    console.log('=== RENDER PAYMENT DETAILS DEBUG ===');
    console.log('isPaymentDetails:', message.isPaymentDetails);
    console.log('paymentValue:', message.paymentValue);
    console.log('paymentAction:', message.paymentAction);
    console.log('====================================');
    
    if (!message.isPaymentDetails || !message.paymentValue || !message.paymentAction) {
      console.log('Payment details not rendered - missing required props');
      return null;
    }

    return (
      <div>
        <PaymentDetails
          message={message.content}
          value={message.paymentValue}
          action={message.paymentAction}
          currentQuestionKey={currentQuestionKey}
          nextQuestionKey={nextQuestionKey}
          onProceed={(paymentLink) => {
            if (onPaymentProceed) {
              onPaymentProceed(paymentLink);
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="mb-4">
      {/* Only render message bubble if there's content or interactive elements inside it */}
      {!isSubmitRequest && (
        <div className={`flex items-start gap-3 ${isBot ? "justify-start" : "justify-end"}`}>
                     {/* Bot Avatar - Left side for bot messages */}
          {isBot && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
              {botImageUrl ? (
                <img src={botImageUrl} alt="Bot" className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-5 h-5 text-purple-500" />
              )}
            </div>
          )}
         
          <div className={`message-bubble ${isBot ? "bot-message" : "user-message"}`}>
            <div className="text-sm">
              {message.isShowCollection ? renderShowCollectionMessage() : 
               message.isBadgePreview ? renderBadgePreview() :
               message.templateType ? renderTemplateMessage() :
               message.isPaymentDetails ? renderPaymentDetails() :
               (isBot ? renderMarkdown(message.content) : <p>{message.content}</p>)}
            </div>

            {/* Photo Upload or Virtual Try-On in-bubble */}
            {isPhotoRequest && onPhotoUpload && !isVirtualTryOn && (
              <PhotoUpload
                onPhotoSelected={handlePhotoUpload}
                mandatory={message.mandatory}
              />
            )}

            {isVirtualTryOn && message.tryOnContext && (
              <VirtualTryOnInline
                tryOnContext={message.tryOnContext}
                onPhotoSelected={handlePhotoUpload}
                onSkip={handleSkip}
                userId={userId}
              />
            )}

            {/* Boolean Choice Buttons */}
            {isBooleanQuestion && onBooleanResponse && (
              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => handleBooleanClick(true)}
                  disabled={isAnswered}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${selectedBooleanValue === true
                    ? 'bg-gray-300 border border-gray-400 text-gray-800'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                >
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => handleBooleanClick(false)}
                  disabled={isAnswered}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed ${selectedBooleanValue === false
                    ? 'bg-gray-300 border border-gray-400 text-gray-800'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                >
                  <span>No</span>
                </button>
              </div>
            )}

            {/* Multi-Select Options */}
            {isMultiSelectQuestion && message.options && onMultiSelectResponse && (
              <div className="mt-3">
                <div className="space-y-2 mb-3">
                  {message.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleOptionToggle(option)}
                      disabled={isAnswered}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left text-sm ${isSelected(option)
                        ? 'bg-purple-100 border-purple-300 text-purple-800'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span className="flex-1">{option}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleMultiSelectSubmit}
                  disabled={isAnswered || selectedOptions.length === 0}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
                >
                  {selectedOptions.length > 0
                    ? `Continue with ${selectedOptions.length} selected`
                    : 'Select options to continue'
                  }
                </button>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  You can select multiple options
                </p>
              </div>
            )}



            {/* Action Buttons - Render inside the message bubble (disabled for virtual try-on) */}
            {hasActionButtons && onActionClick && !message.isBadgePreview && !message.isPaymentDetails && !isVirtualTryOn && (
              <div className="mt-3 flex justify-center">
                <div className="flex gap-3 justify-center">
                  {message.action?.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => handleActionClick(action)}
                      disabled={isAnswered || isProcessing}
                      className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${selectedAction === action
                        ? 'bg-purple-700 text-white'
                        : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                        }`}
                    >
                      {isProcessing && selectedAction === action ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      <span>{action}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
                     {/* User Avatar - Right side for user messages */}
           {!isBot && (
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 shadow-md flex items-center justify-center">
               <User className="w-5 h-5 text-purple-600" />
             </div>
           )}
        </div>
      )}

      {/* Submit Button - Outside the message bubble */}
      {isSubmitRequest && onSubmitRegistration && !hasPaymentDetails && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => {
              setIsAnswered(true);
              onSubmitRegistration();
            }}
            disabled={isAnswered}
            className="px-8 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            {submitLabel && submitLabel.trim() !== '' ? submitLabel : 'Submit'}
          </button>
        </div>
      )}

      

      {/* Special Next Button for Show Collection Messages - Outside the message bubble */}
      {message.isShowCollection && onActionClick && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => handleActionClick('Next')}
            disabled={isAnswered || isProcessing}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing && selectedAction === 'Next' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span>Next</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;