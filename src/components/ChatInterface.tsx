import { useEffect, useRef } from 'react';
import type { EventData } from '../types';
import { ChatStage } from '../types';
import { useChatFlow, useEmailValidation } from '../hooks';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ViewCollectionLink from './ViewCollectionLink';
import { TryOnSessionProvider } from '../hooks/TryOnSessionContext';

interface ChatInterfaceProps {
  eventData: EventData;
}

const ChatInterface = ({ eventData }: ChatInterfaceProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);



  const {
    messages,
    currentStage,
    currentQuestionIndex,
    isProcessing,
    questions,
    initializeChat,
    handleUserInput,
    handleFileUpload,
    handleButtonResponse,
    handleExistingUser,
    handlePaymentProceed,
    addMessage,
    setCurrentStage,
    submitRegistration,
    addUserResponse,
    userInfo,
    // expose to set existing user without name flow
    prepareExistingUserNameUpdate,
    hasShowCollection
  } = useChatFlow(eventData);

  const {
    validateEmail,
    checkUserByEmail,
    getFullName,
    loading: emailLoading
  } = useEmailValidation();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat when component mounts
  useEffect(() => {
    if (eventData) {
      initializeChat();
    }
  }, [eventData, initializeChat]);

  const handleEmailSubmit = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      addMessage({
        type: 'bot',
        content: 'Please enter a valid email address.'
      });
      return;
    }

    // Add user's email message
    addMessage({
      type: 'user',
      content: normalizedEmail
    });

    // Check if user exists
    const userData = await checkUserByEmail(normalizedEmail, eventData?._id);
    const fullName = userData ? getFullName(userData) : null;

    console.log('here1', fullName)

    if (fullName) {
      // User found, skip name collection
      addMessage({
        type: 'bot',
        content: `Great! Welcome ${fullName}!`
      });

      // Handle existing user without showing name as user message
      console.log('Handling existing user:', { email: normalizedEmail, fullName });
      handleExistingUser(normalizedEmail, fullName);
    } else if (userData && !fullName) {
      // Email exists, but name is missing → ask for name and later update via save_user_info
      addUserResponse({ key: 'emailId', value: normalizedEmail, type: 'text' });
      // prime _id and user_id so the name update can be saved when provided
      prepareExistingUserNameUpdate({ _id: userData._id, user_id: userData.user_id });

      setTimeout(() => {
        addMessage({
          type: 'bot',
          content: "Welcome back! What's your full name?"
        });
        setCurrentStage(ChatStage.NAME);
      }, 1000);
    } else {
      // User not found, add email to responses and ask for name
      // Add email response so it's available when user provides name
      console.log('Adding email response for new user:', normalizedEmail);
      addUserResponse({ key: 'emailId', value: normalizedEmail, type: 'text' });
      
      setTimeout(() => {
        addMessage({
          type: 'bot',
          content: "Great! What's your full name?"
        });
        setCurrentStage(ChatStage.NAME);
      }, 1000);
    }
  };

  const handlePhotoUpload = (urls: string[]) => {
    // Pass through as array so we can persist all images (incl. try-on and collection path)
    handleFileUpload(urls);
  };

  const handleBooleanResponse = (value: boolean) => {
    const response = value ? 'Yes' : 'No';
    // Add response and process with proper flow (including action buttons)
    handleUserInput(response);
  };

  const handleMultiSelectResponse = (selected: string[]) => {
    // Add response and process with proper flow (including action buttons)
    handleUserInput(selected.join(','));
  };

  const handleTextResponse = (text: string) => {
    // Handle the user input (this will add the user message and process the response)
    handleUserInput(text);
  };

  const handleTemplateDataCollected = (questionKey: string, data: { images: string[]; texts: string[] }) => {
    console.log('=== TEMPLATE DATA COLLECTED IN CHAT INTERFACE ===');
    console.log('Question Key:', questionKey);
    console.log('Data:', data);
    console.log('Calling addUserResponse with template data...');
    
    // Create the response value array with images and texts combined
    const responseValue = [...data.images, ...data.texts];
    
    console.log('Response Value:', responseValue);
    console.log('================================================');
    
    // Add the template response to user responses
    addUserResponse({
      key: questionKey,
      value: responseValue,
      type: 'template'
    });
  };

  const getCurrentQuestion = () => {
    if (currentStage === ChatStage.DYNAMIC_QUESTIONS && questions[currentQuestionIndex]) {
      return questions[currentQuestionIndex];
    }
    return null;
  };

  const currentQuestion = getCurrentQuestion();

  // Check if the last message has action buttons (like "Next" button)
  const lastMessage = messages[messages.length - 1];
  const hasActionButtons = lastMessage && 
    lastMessage.type === 'bot' && 
    lastMessage.action && 
    lastMessage.action.length > 0;

  // Determine if input form should be shown
  const shouldShowInputForm = () => {
    // If there are action buttons (like "Next"), don't show input form
    if (hasActionButtons) {
      return false;
    }

    // Show input form for email and name stages
    if (currentStage === ChatStage.EMAIL || currentStage === ChatStage.NAME) {
      return true;
    }

    // Show input form for dynamic questions that require user input
    if (currentStage === ChatStage.DYNAMIC_QUESTIONS && currentQuestion && currentQuestion.is_user_input) {
      return true;
    }
    console.log('eventDatasss', eventData);

    return false;
  };

  return (
    <TryOnSessionProvider>
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Banner Image - Separate from chat container */}
        {messages.length > 0 && messages[0].type === 'banner' && (
          <div className="mb-4">
            <img
              src={messages[0].url}
              alt="Event Banner"
              className="w-full rounded-lg shadow-lg"
              style={{ aspectRatio: '21 / 9', objectFit: 'cover' }}
            />
            
            {/* Chat Link - Shows if chat_link is present in event data */}
            {/* {eventData.agent_url?.chat_link && (
              <div className="mt-3 text-center">
                <a
                  href={eventData.agent_url.chat_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 border-b border-purple-600 hover:text-purple-600 hover:border-purple-600"
                >
                  Chat Agent
                </a>
              </div>
            )} */}
          </div>
        )}

        {/* View Collection Link - Shows when show_collection exists and user has username */}
        {(() => {
          const showCollection = hasShowCollection();
          const hasUserName = userInfo.user_name;
          console.log('=== VIEW COLLECTION DEBUG ===');
          console.log('hasShowCollection:', showCollection);
          console.log('userInfo:', userInfo);
          console.log('userInfo.user_name:', hasUserName);
          console.log('Should show link:', showCollection && hasUserName);
          console.log('=============================');
          
          return showCollection && hasUserName ? (
            <ViewCollectionLink userName={userInfo.user_name!} storeName={eventData?.store_name!} />
          ) : null;
        })()}

        {/* Chat Container */}
        <div className="bg-white rounded-lg shadow-lg mt-12">
          {/* Chat Messages */}
          <div className="p-4 pt-6 space-y-6">
            {messages.filter(msg => msg.type !== 'banner').map((message) => {
              // Determine the next question key
              const nextQuestionKey = (() => {
                if (currentQuestionIndex + 1 < questions.length) {
                  return questions[currentQuestionIndex + 1]?.key;
                }
                // If we're at the end of questions, the next step is submit
                return 'submit';
              })();

              // Check if there are any payment details in the conversation
              const hasPaymentDetails = messages.some(msg => msg.isPaymentDetails);

              // Determine submit label from admin_details.submit_response.action[0]
              const submitLabel = (() => {
                try {
                  const submitDetail = eventData?.admin_details?.find((d: any) => d.key === 'submit_response');
                  const actions = submitDetail?.action;
                  if (Array.isArray(actions) && actions.length > 0) {
                    // support both array of strings and array of objects with key/label
                    const first = actions[0];
                    if (typeof first === 'string') return first;
                    if (first && typeof first === 'object') {
                      // common shape in our types: { key, position }
                      if (typeof first.key === 'string' && first.key.trim() !== '') return first.key;
                      if (typeof first.position === 'string' && first.position.trim() !== '') return first.position;
                    }
                  }
                } catch {}
                return 'Submit';
              })();

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onPhotoUpload={handlePhotoUpload}
                  onBooleanResponse={handleBooleanResponse}
                  onMultiSelectResponse={handleMultiSelectResponse}
                  onSubmitRegistration={submitRegistration}
                  onActionClick={handleButtonResponse}
                  isProcessing={isProcessing}
                  onTemplateDataCollected={handleTemplateDataCollected}
                  currentQuestionKey={currentQuestion?.key}
                  nextQuestionKey={nextQuestionKey}
                  onPaymentProceed={handlePaymentProceed}
                  hasPaymentDetails={hasPaymentDetails}
                  userId={userInfo.user_id}
                  botImageUrl={eventData?.bot_image}
                  submitLabel={submitLabel}
                />
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Components - Conditionally shown */}
          {shouldShowInputForm() && (
            <div className="p-4 pt-0">
              {currentStage === ChatStage.EMAIL && (
                <ChatInput
                  onSendMessage={handleEmailSubmit}
                  disabled={isProcessing || emailLoading}
                  placeholder="Enter your email address..."
                />
              )}

              {currentStage === ChatStage.NAME && (
                <ChatInput
                  onSendMessage={(input) => handleUserInput(input)}
                  disabled={isProcessing}
                  placeholder="Enter your full name..."
                />
              )}

              {currentStage === ChatStage.DYNAMIC_QUESTIONS && currentQuestion && currentQuestion.is_user_input && (
                <>
                  {currentQuestion.type === 'text' && (
                    <ChatInput
                      onSendMessage={handleTextResponse}
                      disabled={isProcessing}
                      placeholder="Type your answer..."
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </TryOnSessionProvider>
  );
};

export default ChatInterface;