import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage, EventData, AdminDetail, UserResponse } from '../types';
import { ChatStage } from '../types';
import { eventApi, userApi, collectionApi } from '../services/api';

export const useChatFlow = (eventData: EventData | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<ChatStage>(ChatStage.LOADING);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userInfo, setUserInfo] = useState<{ user_id?: string; user_name?: string; _id?: string }>({});
  const [awaitingNameForExisting, setAwaitingNameForExisting] = useState<boolean>(false);
  const isInitialized = useRef(false);
  const [isFromButtonClick, setIsFromButtonClick] = useState(false);
  const [pendingQuestionIndex, setPendingQuestionIndex] = useState<number | null>(null);
  const [pendingEmailVerificationEmail, setPendingEmailVerificationEmail] = useState<string | null>(null);
  const [pendingEmailVerificationName, setPendingEmailVerificationName] = useState<string | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const addUserResponse = useCallback((response: UserResponse) => {
    console.log('Adding user response:', response);
    setUserResponses(prev => {
      const newResponses = [...prev, response];
      console.log('Updated userResponses:', newResponses);
      return newResponses;
    });
  }, []);

  const getFilteredQuestions = useCallback((): AdminDetail[] => {
    if (!eventData) return [];

    // Get all keys that are referenced in action arrays
    const actionKeys = new Set<string>();
    eventData.admin_details.forEach(detail => {
      if (detail.action && Array.isArray(detail.action)) {
        detail.action.forEach((actionItem: any) => {
          if (actionItem.key) {
            actionKeys.add(actionItem.key);
          }
        });
      }
    });

    console.log('=== FILTERING QUESTIONS DEBUG ===');
    console.log('All admin details:', eventData.admin_details);
    console.log('Action keys:', Array.from(actionKeys));
    console.log('Current group:', eventData.current_group);

    const filtered = eventData.admin_details.filter(detail => {
      // Basic filtering conditions
      const basicFilter = detail.is_display &&
        detail.type !== 'action' &&
        !actionKeys.has(detail.key) &&
        !['welcome_banner', 'welcome_note', 'full_name', 'emailId', 'next_action'].includes(detail.key);

      // Group filtering logic
      let groupFilter = true;
      if (detail.group) {
        if (Array.isArray(detail.group)) {
          // If group is an array, check if current_group is included
          groupFilter = detail.group.includes(eventData.current_group);
        } else if (typeof detail.group === 'string') {
          // If group is a string, check if it matches current_group
          groupFilter = detail.group === eventData.current_group;
        }
      }
      // If no group is specified, include the question (groupFilter remains true)

      const result = basicFilter && groupFilter;
      
      // Debug each question
      if (detail.key === 'payment_details' || detail.type === 'payment_details') {
        console.log('=== PAYMENT DETAILS QUESTION DEBUG ===');
        console.log('Question:', detail);
        console.log('is_display:', detail.is_display);
        console.log('type:', detail.type);
        console.log('key:', detail.key);
        console.log('group:', detail.group);
        console.log('basicFilter:', basicFilter);
        console.log('groupFilter:', groupFilter);
        console.log('actionKeys.has(detail.key):', actionKeys.has(detail.key));
        console.log('excluded keys check:', ['welcome_banner', 'welcome_note', 'full_name', 'emailId', 'next_action'].includes(detail.key));
        console.log('Final result:', result);
        console.log('=====================================');
      }

      return result;
    });

    console.log('Filtered questions:', filtered);
    console.log('=====================================');

    return filtered;
  }, [eventData]);

  const initializeChat = useCallback(() => {
    if (!eventData || isInitialized.current) return;

    isInitialized.current = true;
    setMessages([]);
    setCurrentStage(ChatStage.LOADING);

    // Check for welcome banner
    const welcomeBanner = eventData.admin_details.find(detail => detail.key === 'welcome_banner');
    if (welcomeBanner?.value && typeof welcomeBanner.value === 'string' && welcomeBanner.value.trim()) {
      addMessage({
        type: 'banner',
        content: '',
        url: welcomeBanner.value
      });
    }

    // Check for welcome note
    const welcomeNote = eventData.admin_details.find(detail => detail.key === 'welcome_note');
    if (welcomeNote?.message) {
      addMessage({
        type: 'bot',
        content: welcomeNote.message
      });
    }

    // Start with email collection
    setTimeout(() => {
      addMessage({
        type: 'bot',
        content: "May I have your email address?"
      });
      setCurrentStage(ChatStage.EMAIL);
    }, 1000);
  }, [eventData, addMessage]);

  const submitRegistration = useCallback(async () => {
    if (!eventData) return;

    try {
      setIsProcessing(true);

      // Get user info from responses
      const emailResponse = userResponses.find(response => response.key === 'emailId');
      const nameResponse = userResponses.find(response => response.key === 'full_name' || response.key === 'name');
      
      // If we don't have user_id from registration, try to get it from API
      let finalUserInfo = { ...userInfo };
      let userInfluencerStatus = false;
      
      if (!finalUserInfo.user_id && emailResponse?.value) {
        const userInfoResult = await userApi.getUserInfo((emailResponse.value as string).trim().toLowerCase());
        if (userInfoResult) {
          finalUserInfo = {
            user_id: userInfoResult.user_id,
            user_name: userInfoResult.user_name
          };
          userInfluencerStatus = userInfoResult.is_influencer || false;
        }
      }

      // If we don't have _id, try to get it from validateByEmail API
      if (!finalUserInfo._id && emailResponse?.value) {
        const userValidationData = await userApi.validateByEmail((emailResponse.value as string).trim().toLowerCase());
        if (userValidationData && userValidationData._id) {
          finalUserInfo._id = userValidationData._id;
          // Also get is_influencer from validation data if not already set
          if (!userInfluencerStatus && userValidationData.is_influencer !== undefined) {
            userInfluencerStatus = userValidationData.is_influencer;
          }
        }
      }

      // Prepare event details in the required format
      const eventDetails = userResponses
        .filter(response => response.key !== 'emailId' && response.key !== 'full_name' && response.key !== 'name')
        .map(response => ({
          key: response.key,
          value: Array.isArray(response.value) ? response.value : [response.value]
        }));

      // Prepare submission data for final registration (only register_source and event_details)
      const submissionData: any = {
        _id: finalUserInfo._id,
        user_id: finalUserInfo.user_id,
        user_name: finalUserInfo.user_name || (nameResponse?.value as string),
        emailId: (emailResponse?.value as string)?.trim().toLowerCase(),
        is_influencer: userInfluencerStatus,
        register_source: eventData._id,
        current_group: eventData.current_group,
        event_details: eventDetails
      };

      // Console log the payload and API URL
      console.log('=== FINAL REGISTRATION SUBMISSION ===');
      console.log('Payload:', JSON.stringify(submissionData, null, 2));
      console.log('User Responses:', userResponses);
      console.log('Event Data:', eventData);
      console.log('===============================');

      // Submit to API
      const success = await eventApi.submitRegistration(submissionData);

      if (success) {
        // Check for admin email notification
        const adminEmailNotifyDetail = eventData.admin_details.find(detail => detail.key === 'admin_email_notify');
        if (adminEmailNotifyDetail && eventData.creator_emailId) {
          try {
            // Format user responses into readable message
            const userEmail = (emailResponse?.value as string)?.trim().toLowerCase();
            const userName = (nameResponse?.value as string);
            const responseMessage = (adminEmailNotifyDetail?.response_message as string);
            
            // Create readable message with user responses
            let messageContent = `${responseMessage}<br/><br/>`;
            messageContent += `<strong>User Details:</strong><br/>`;
            messageContent += `Name: ${userName}<br/>`;
            messageContent += `Email: ${userEmail}<br/><br/>`;
            
            // Add all user responses in readable format
            messageContent += `<strong>Submission Details:</strong><br/>`;
            userResponses.forEach(response => {
              if (response.key !== 'emailId' && response.key !== 'full_name' && response.key !== 'name') {
                // Find the label from admin_details
                const adminDetail = eventData.admin_details.find(detail => detail.key === response.key);
                const questionLabel = adminDetail?.message || response.key;
                let answerValue = '';
                
                if (Array.isArray(response.value)) {
                  answerValue = response.value.join(', ');
                } else if (typeof response.value === 'object' && response.value !== null) {
                  answerValue = JSON.stringify(response.value);
                } else {
                  answerValue = String(response.value || '');
                }
                
                messageContent += `Q: ${questionLabel}<br/>A: ${answerValue}<br/>`;
              }
            });

            // Send admin notification email
            await eventApi.sendAdminNotification({
              to_email: eventData.creator_emailId,
              subject: "New submission received",
              message: messageContent,
              signature_text: "Unthink team"
            });
            
            console.log('Admin notification email sent successfully');
          } catch (emailError) {
            console.error('Failed to send admin notification email:', emailError);
            // Don't fail the entire submission if email fails
          }
        }

        // Check if there's a badge_template action
        const badgeTemplateDetail = eventData.admin_details.find(detail => detail.key === 'badge_template');

        // Debug logging
        console.log('=== BADGE TEMPLATE CHECK ===');
        console.log('Badge Template Detail:', badgeTemplateDetail);
        console.log('All Admin Details:', eventData.admin_details);
        console.log('============================');

        // Check for next_action with badge_template
        const nextActionDetail = eventData.admin_details.find(detail => detail.key === 'next_action');
        const hasBadgeTemplateInNextAction = nextActionDetail && nextActionDetail.action &&
          nextActionDetail.action.some((action: any) => action.key === 'badge_template');

        const hasBadgeTemplate = (badgeTemplateDetail && badgeTemplateDetail.action &&
          badgeTemplateDetail.action.some((action: any) => action.key === 'badge_template')) || hasBadgeTemplateInNextAction;

        console.log('Has Badge Template:', hasBadgeTemplate);
        console.log('Next Action Detail:', nextActionDetail);

        // Check for submit_response admin detail and use its response_message if available
        const submitResponseDetail = eventData.admin_details.find(detail => detail.key === 'submit_response');
        const submitMessage = submitResponseDetail?.response_message || "Thank you for submitting your answer! Your information has been successfully recorded. 🎉";
        
        // Always show success message regardless of badge template
        addMessage({
          type: 'bot',
          content: submitMessage
        });
        setCurrentStage(ChatStage.COMPLETED);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Registration submission error:', error);
      addMessage({
        type: 'bot',
        content: "I'm sorry, there was an issue submitting your registration. Please try again or contact support."
      });
      // Stay in current stage to allow retry
    } finally {
      setIsProcessing(false);
    }
  }, [eventData, userResponses, userInfo, addMessage, setCurrentStage, setIsProcessing]);

  const processNextQuestion = useCallback(async (questionIndex?: number) => {
    console.log('=== PROCESS NEXT QUESTION CALLED ===');
    const questions = getFilteredQuestions();
    const indexToUse = questionIndex !== undefined ? questionIndex : currentQuestionIndex;
    
    console.log('Questions array length:', questions.length);
    console.log('Index to use:', indexToUse);
    console.log('Questions array:', questions.map(q => ({ key: q.key, type: q.type })));
    console.log('Current question index state:', currentQuestionIndex);
    console.log('Question index parameter:', questionIndex);

    if (indexToUse >= questions.length) {
      console.log('REACHED END OF QUESTIONS - SHOWING SUBMIT');
      console.log('Index out of bounds - indexToUse:', indexToUse, 'questions.length:', questions.length);
      console.log('This means we\'re trying to access question at index', indexToUse, 'but only have', questions.length, 'questions');
      console.log('Available questions:', questions.map((q, i) => `${i}: ${q.key} (${q.type})`));
      // All questions completed - show submit button
      addMessage({
        type: 'bot',
        content: "",
        inputType: 'submit'
      });

      setCurrentStage(ChatStage.READY_TO_SUBMIT);
      return;
    }

    const currentQuestion = questions[indexToUse];
    console.log('Processing question at index', indexToUse, ':', currentQuestion);
    console.log('Question type:', currentQuestion?.type);
    console.log('Question key:', currentQuestion?.key);
    
    // Safety check - if currentQuestion is undefined, reset the index
    if (!currentQuestion) {
      console.log('ERROR: currentQuestion is undefined at index', indexToUse);
      console.log('Resetting currentQuestionIndex to 0');
      setCurrentQuestionIndex(0);
      return;
    }
    
    // Reset the button click flag when processing a new question
    setIsFromButtonClick(false);

    console.log('=== ACTION BUTTON DEBUG ===');
    console.log('Question:', currentQuestion.key);
    console.log('Action:', currentQuestion.action);
    console.log('Action Type:', currentQuestion.action_type);
    console.log('Is User Input:', currentQuestion.is_user_input);
    console.log('Type:', currentQuestion.type);
    console.log('==========================');

    // Check if this question requires user responses that might not be available yet
    if (currentQuestion.key === 'show_collection') {
      const emailResponse = userResponses.find(response => response.key === 'emailId');
      if (!emailResponse) {
        console.log('Email response not found, setting as pending question');
        setPendingQuestionIndex(indexToUse);
        return;
      }
    }

    // Special handling for show_collection question
    if (currentQuestion.key === 'show_collection') {
      // Get user name from validateByEmail API
      console.log('=== SHOW_COLLECTION DEBUG ===');
      console.log('userResponses', userResponses);
      console.log('userResponses length:', userResponses.length);
      console.log('Current question index:', currentQuestionIndex);
      console.log('=============================');
      const emailResponse = userResponses.find(response => response.key === 'emailId');
      let userName = 'Guest';

      console.log('emailResponse', emailResponse);
      
      if (emailResponse?.value && typeof emailResponse.value === 'string') {
        try {
          const userValidationData = await userApi.validateByEmail(emailResponse.value);
          console.log('emailResponse', emailResponse);
          console.log('userValidationData', userValidationData);
          if (userValidationData && userValidationData.user_name) {
            userName = userValidationData.user_name;
          } else {
            // Fallback to local responses if API doesn't return user_name
            const nameResponse = userResponses.find(response => 
              response.key === 'full_name' || response.key === 'name'
            );
            userName = nameResponse?.value as string || 'Guest';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to local responses
          const nameResponse = userResponses.find(response => 
            response.key === 'full_name' || response.key === 'name'
          );
          userName = nameResponse?.value as string || 'Guest';
        }
      } else {
        // Fallback to local responses if no email found
        const nameResponse = userResponses.find(response => 
          response.key === 'full_name' || response.key === 'name'
        );
        userName = nameResponse?.value as string || 'Guest';
      }
      
      console.log('userName', userName);
      // Create the collection link
      const collectionLink = `https://unthink-ui-gatsby-${eventData?.store_name}-ui-314035436999.us-central1.run.app/influencer/${encodeURIComponent(userName)}`;
      
      // Add message with special flag for show_collection
      addMessage({
        type: 'bot',
        content: currentQuestion.message,
        isShowCollection: true,
        collectionLink: collectionLink
      });

      // Don't auto-advance, wait for user to click Next button
      return;
    }

    // Special handling for payment_details type
    console.log('=== CHECKING PAYMENT DETAILS TYPE ===');
    console.log('Current question type:', currentQuestion.type);
    console.log('Current question key:', currentQuestion.key);
    console.log('Is payment_details?', currentQuestion.type === 'payment_details' || currentQuestion.key === 'payment_details');
    
    if (currentQuestion.type === 'payment_details' || currentQuestion.key === 'payment_details') {
      console.log('=== CREATING PAYMENT DETAILS MESSAGE ===');
      console.log('Payment details type:', currentQuestion.type);
      console.log('Payment details value:', currentQuestion.value);
      console.log('Payment details actions:', currentQuestion.action);
      
      // Add message with payment details
      const paymentMessage = {
        type: 'bot' as const,
        content: currentQuestion.message,
        isPaymentDetails: true,
        paymentValue: currentQuestion.value as any,
        paymentAction: currentQuestion.action?.map((actionItem: any) => 
          typeof actionItem === 'string' ? actionItem : actionItem.key || ''
        ) || []
      };
      
      console.log('Adding payment message:', paymentMessage);
      addMessage(paymentMessage);

      console.log('=== PAYMENT DETAILS MESSAGE CREATED ===');
      
      // Set the stage to DYNAMIC_QUESTIONS so payment responses work
      setCurrentStage(ChatStage.DYNAMIC_QUESTIONS);
      
      // Don't auto-advance, wait for user to interact with payment details
      return;
    }

    // Special handling for template types (image_text_template, image_template, text_template)
    if (currentQuestion.type === 'image_text_template' || 
        currentQuestion.type === 'image_template' || 
        currentQuestion.type === 'text_template') {
      
      console.log('=== CREATING TEMPLATE MESSAGE ===');
      console.log('Template type:', currentQuestion.type);
      console.log('Template value:', currentQuestion.value);
      console.log('Template actions:', currentQuestion.action);
      
      // Add message with template type and value
      const templateMessage = {
        type: 'bot' as const,
        content: currentQuestion.message,
        templateType: currentQuestion.type,
        templateValue: currentQuestion.value as any,
        action: currentQuestion.action?.map((actionItem: any) => 
          typeof actionItem === 'string' ? actionItem : actionItem.key || ''
        ) || [],
        action_type: 'button' as const,
        response_message: (currentQuestion as any).response_message
      };
      
      console.log('Adding template message:', templateMessage);
      addMessage(templateMessage);

      console.log('=== TEMPLATE MESSAGE CREATED ===');
      
      // Set the stage to DYNAMIC_QUESTIONS so button responses work
      setCurrentStage(ChatStage.DYNAMIC_QUESTIONS);
      
      // Don't auto-advance, wait for user to interact with template
      return;
    }

    // Check if this is an informational message (no user input required)
    if (!currentQuestion.is_user_input) {
      // Check if this message has action buttons
      const hasActionButtons = currentQuestion.action &&
        Array.isArray(currentQuestion.action) &&
        currentQuestion.action.length > 0 &&
        currentQuestion.action.some((actionItem: any) => {
          if (typeof actionItem === 'string') {
            return actionItem.trim() !== '';
          } else if (actionItem && typeof actionItem === 'object') {
            return actionItem.key && actionItem.key.trim() !== '';
          }
          return false;
        });

      if (hasActionButtons) {
        // Show message with action buttons
        addMessage({
          type: 'bot',
          content: currentQuestion.message,
          action: currentQuestion.action?.map((actionItem: any) => 
            typeof actionItem === 'string' ? actionItem : actionItem.key || ''
          ) || [],
          action_type: 'button',
          response_message: (currentQuestion as any).response_message
        });
        // Don't auto-advance, wait for user to click action button
        return;
      } else {
        // Just show the message
        addMessage({
          type: 'bot',
          content: currentQuestion.message
        });

        // Only auto-advance if not coming from a button click
        if (!isFromButtonClick) {
          // Automatically move to next question after a delay
          const nextIndex = indexToUse + 1;
          setCurrentQuestionIndex(nextIndex);
          setTimeout(() => {
            processNextQuestion(nextIndex);
          }, 1500);
        }
        return;
      }
    }

    // Regular question that requires user input
    addMessage({
      type: 'bot',
      content: currentQuestion.message,
      inputType: currentQuestion.type === 'multi select' ? 'multiselect' :
        currentQuestion.type === 'upload file' ? 'upload' :
          currentQuestion.type === 'boolean' ? 'boolean' :
            currentQuestion.type === 'try on' ? 'virtual_tryon' : 'text',
      options: Array.isArray(currentQuestion.value) ? currentQuestion.value :
        Array.isArray(currentQuestion.options) ? currentQuestion.options : undefined,
      mandatory: currentQuestion.mandatory,
      response_message: (currentQuestion as any).response_message,
      tryOnContext: currentQuestion.type === 'try on' ? {
        store: eventData?.store_name || '',
        serviceId: eventData?.service_id || '',
        prompt: ((eventData?.admin_details.find((d) => d.key === 'prompt_control')?.value as any)?.['try on']) || '',
        maxImages: typeof currentQuestion.value === 'number' ? currentQuestion.value : 2,
        hint: (currentQuestion as any)?.hint
      } : undefined
    });

    setCurrentStage(ChatStage.DYNAMIC_QUESTIONS);
  }, [currentQuestionIndex, getFilteredQuestions, addMessage]);

  // Handle pending questions when user responses become available
  useEffect(() => {
    if (pendingQuestionIndex !== null) {
      const questions = getFilteredQuestions();
      const pendingQuestion = questions[pendingQuestionIndex];
      
      if (pendingQuestion?.key === 'show_collection') {
        const emailResponse = userResponses.find(response => response.key === 'emailId');
        if (emailResponse) {
          console.log('User responses now available, processing pending question');
          setPendingQuestionIndex(null);
          processNextQuestion(pendingQuestionIndex);
        }
      }
    }
  }, [userResponses, pendingQuestionIndex, getFilteredQuestions, processNextQuestion]);

  const handleFileUpload = useCallback((fileUrl: string | string[]) => {
    setIsProcessing(true);

    // Process based on current stage
    setTimeout(() => {
      (async () => {
        if (currentStage === ChatStage.DYNAMIC_QUESTIONS) {
          const questions = getFilteredQuestions();
          const currentQuestion = questions[currentQuestionIndex];

          addUserResponse({
            key: currentQuestion.key,
            value: fileUrl,
            type: currentQuestion.type
          });

          // Check if this is a profile_image upload
          if (currentQuestion.key === 'profile_image' && fileUrl) {
            // Extract the first URL if multiple URLs are provided (separated by '|')
            const firstImageUrl = Array.isArray(fileUrl)
              ? fileUrl[0]
              : (fileUrl.includes('|') ? fileUrl.split('|')[0].trim() : fileUrl);
            
            // Get user name from responses
            const nameResponse = userResponses.find(response => 
              response.key === 'full_name' || response.key === 'name'
            );
            
            const emailResponse = userResponses.find(response => response.key === 'emailId');
            const userName = nameResponse?.value as string || 'Guest';

            // Get user info for API call
            let finalUserInfo = { ...userInfo };
            let userInfluencerStatus = false;
            
            if (!finalUserInfo.user_id && emailResponse?.value) {
              const userInfoResult = await userApi.getUserInfo((emailResponse.value as string).trim().toLowerCase());
              if (userInfoResult) {
                finalUserInfo = {
                  user_id: userInfoResult.user_id,
                  user_name: userInfoResult.user_name
                };
                userInfluencerStatus = userInfoResult.is_influencer || false;
              }
            }

            // Check if next_action contains badge_template action
            const nextActionDetail = eventData?.admin_details.find(detail => detail.key === 'next_action');
            const hasBadgeTemplateInNextAction = nextActionDetail && nextActionDetail.action &&
              nextActionDetail.action.some((action: any) => action.key === 'badge_template');

            console.log('=== PROFILE IMAGE UPLOAD DEBUG ===');
            console.log('Next Action Detail:', nextActionDetail);
            console.log('Has Badge Template in Next Action:', hasBadgeTemplateInNextAction);
            console.log('===================================');

            // If we don't have _id, try to get it from validateByEmail API
            if (!finalUserInfo._id && emailResponse?.value) {
              const userValidationData = await userApi.validateByEmail((emailResponse.value as string).trim().toLowerCase());
              if (userValidationData && userValidationData._id) {
                finalUserInfo._id = userValidationData._id;
                // Also get is_influencer from validation data if not already set
                if (!userInfluencerStatus && userValidationData.is_influencer !== undefined) {
                  userInfluencerStatus = userValidationData.is_influencer;
                }
              }
            }

            // Split name into first_name and last_name
            const fullName = nameResponse?.value as string || '';
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            // Submit profile image data
            try {
              const profileData = {
                _id: finalUserInfo._id,
                user_id: finalUserInfo.user_id,
                user_name: finalUserInfo.user_name || userName,
                emailId: (emailResponse?.value as string)?.trim().toLowerCase(),
                is_influencer: userInfluencerStatus,
                profile_image: Array.isArray(fileUrl)
                  ? fileUrl[0]
                  : (fileUrl.includes('|') ? fileUrl.split('|')[0].trim() : fileUrl),
                first_name: firstName,
                last_name: lastName
              };

              console.log('=== PROFILE IMAGE SUBMISSION ===');
              console.log('Profile Data:', JSON.stringify(profileData, null, 2));
              console.log('===============================');

              await eventApi.submitProfileImage(profileData);
              console.log('Profile image submitted successfully');
            } catch (error) {
              console.error('Failed to submit profile image:', error);
              // Continue with the flow even if profile image submission fails
            }

            // Only show badge preview if next_action does NOT contain badge_template
            if (!hasBadgeTemplateInNextAction) {
              // Add badge preview message with explicit Next button using the first image
              addMessage({
                type: 'bot',
                content: '',
                isBadgePreview: true,
                badgeImageUrl: firstImageUrl,
                badgeUserName: userName,
                action: ['Next'], // Always include Next button for badge preview
                action_type: 'button'
              });

              // Badge preview always has a Next button, so we don't auto-advance
              // User will click Next to proceed to the next question
            } else {
              // If next_action contains badge_template, just proceed to next question without showing badge
              console.log('Skipping badge preview because next_action contains badge_template');
              // Advance to next question index and process it
              const nextIndex = currentQuestionIndex + 1;
              setCurrentQuestionIndex(nextIndex);
              setTimeout(() => {
                processNextQuestion(nextIndex);
              }, 100);
            }
          } else {
            // Regular file upload handling (not profile_image)
            // Check if current question has action buttons (like "next" or "add to collection")
            const hasActionButtons = currentQuestion.action &&
              Array.isArray(currentQuestion.action) &&
              currentQuestion.action.length > 0 &&
              currentQuestion.action.some((actionItem: any) => {
                if (typeof actionItem === 'string') {
                  return actionItem.trim() !== '';
                } else if (actionItem && typeof actionItem === 'object') {
                  return actionItem.key && actionItem.key.trim() !== '';
                }
                return false;
              });

            if (hasActionButtons) {
              // Show response message first, then show action buttons
              if (currentQuestion.response_message && currentQuestion.response_message.trim()) {
                setTimeout(() => {
                  addMessage({
                    type: 'bot',
                    content: currentQuestion.response_message!,
                    action: currentQuestion.action?.map((actionItem: any) => 
                      typeof actionItem === 'string' ? actionItem : actionItem.key || ''
                    ) || [],
                    action_type: 'button'
                  });
                }, 1000);
              } else {
                // No response message, show action buttons immediately
                setTimeout(() => {
                  addMessage({
                    type: 'bot',
                    content: '',
                    action: currentQuestion.action?.map((actionItem: any) => 
                      typeof actionItem === 'string' ? actionItem : actionItem.key || ''
                    ) || [],
                    action_type: 'button'
                  });
                }, 500);
              }
            } else {
              // No action buttons, automatically advance to next question
              const nextQuestionIndex = currentQuestionIndex + 1;
              setCurrentQuestionIndex(nextQuestionIndex);

              setTimeout(() => {
                processNextQuestion(nextQuestionIndex);
              }, 500);
            }
          }
        }

        setIsProcessing(false);
      })();
    }, 1000);
  }, [currentStage, currentQuestionIndex, addMessage, addUserResponse, processNextQuestion, getFilteredQuestions, userResponses, userInfo]);

  const handleNewUserRegistration = useCallback(async (email: string, name: string) => {
    try {
      setIsProcessing(true);
      
      // Branch based on user_signup_type
      const signupType = eventData?.user_signup_type || 'active';

      // Step 1: Register the user with required fields
      const registerData: any = {
        emailId: email,
        user_name: name.replace(/\s+/g, '_'),
        name: name,
        register_source: eventData?._id || 'unknown',
        store: eventData?.store_name || ''
      };
      
      if (signupType === 'verify_email') {
        registerData.is_agent = true;
        registerData.signature_text = eventData?.email_verification_signature_text || '';
        registerData.signature_domain_link = eventData?.email_verification_signature_domain_link || '';
        registerData.trial_user = false;
      }

      console.log('registrating');
      const registrationResult = await userApi.registerUser(registerData);
      if (!registrationResult) {
        throw new Error('Registration failed');
      }
      console.log('registration done');

      // Step 2: Fetch user info
      const userValidationData = await userApi.validateByEmail(email.trim().toLowerCase());
      if (!userValidationData) {
        throw new Error('Failed to get user info');
      }

      // If verify_email flow, show verification prompt with Continue loop until active
      if (signupType === 'verify_email') {
        const showVerifyPrompt = () => {
          addMessage({
            type: 'bot',
            content: 'We have sent you a verification email. Once you have verified it, come back and click on Continue below.',
            action: ['Continue'],
            action_type: 'button'
          });
        };

        // Show prompt and set pending state for button-loop
        showVerifyPrompt();
        setPendingEmailVerificationEmail(email.trim().toLowerCase());
        setPendingEmailVerificationName(name);

        // Store minimal responses so we can continue after activation
        addUserResponse({ key: 'emailId', value: email.trim().toLowerCase(), type: 'text' });
        addUserResponse({ key: 'full_name', value: name, type: 'text' });

        // Update local userInfo
        setUserInfo({
          user_id: userValidationData.user_id,
          user_name: userValidationData.user_name || name.replace(/\s+/g, '_'),
          _id: userValidationData._id
        });

        // Return: wait for user to click Continue to re-check status
        return;
      }

      // For active flow: verify then continue
      setUserInfo({
        user_id: userValidationData.user_id,
        user_name: userValidationData.user_name,
        _id: userValidationData._id
      });

      const verificationResult = userValidationData.user_id ? await userApi.verifyUser(userValidationData.user_id, eventData?.store_name) : false;
      if (!verificationResult) {
        console.warn('User verification failed, but continuing with flow');
      }

      addUserResponse({ key: 'emailId', value: email.trim().toLowerCase(), type: 'text' });
      addUserResponse({ key: 'full_name', value: name, type: 'text' });

      addMessage({
        type: 'bot',
        content: `Welcome ${name}! Your account has been created successfully.`
      });

      setTimeout(() => {
        processNextQuestion();
      }, 1000);

    } catch (error) {
      console.error('New user registration error:', error);
      addMessage({
        type: 'bot',
        content: "I'm sorry, there was an issue creating your account. Please try again or contact support."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [eventData, addMessage, addUserResponse, processNextQuestion]);

  // Prepare flow when user exists by email but has no name; ask for name and update later
  const prepareExistingUserNameUpdate = useCallback((params: { _id?: string; user_id?: string }) => {
    setUserInfo(prev => ({ ...prev, _id: params._id, user_id: params.user_id }));
    setAwaitingNameForExisting(true);
  }, []);

  const handleUserInput = useCallback((input: string) => {
    setIsProcessing(true);

    // Add user message
    addMessage({
      type: 'user',
      content: input
    });

    // Process based on current stage
    setTimeout(() => {
      if (currentStage === ChatStage.EMAIL) {
        const normalizedEmail = input.trim().toLowerCase();
        addUserResponse({ key: 'emailId', value: normalizedEmail, type: 'text' });
        // Move to name or next questions based on email validation result
        setCurrentStage(ChatStage.NAME);
      } else if (currentStage === ChatStage.NAME) {
        const emailResponse = userResponses.find(response => response.key === 'emailId');
        const normalizedEmail = (emailResponse?.value as string | undefined)?.trim().toLowerCase();
        // If existing user lacked name, update their profile instead of registering
        if (awaitingNameForExisting && userInfo._id && userInfo.user_id) {
          (async () => {
            try {
              const success = await userApi.saveUserName({
                _id: userInfo._id!,
                user_id: userInfo.user_id!,
                name: input,
                is_influencer: true
              });
              if (!success) throw new Error('Failed to save user name');

              // Update local state and proceed
              setUserInfo(prev => ({ ...prev, user_name: input }));
              addUserResponse({ key: 'full_name', value: input, type: 'text' });
              setAwaitingNameForExisting(false);

              setTimeout(() => {
                processNextQuestion();
              }, 500);
            } catch (error) {
              console.error('Existing user name update error:', error);
              addMessage({ type: 'bot', content: "Couldn't update your name. Please try again." });
              setIsProcessing(false);
            }
          })();
        } else if (normalizedEmail) {
          // New user registration path
          handleNewUserRegistration(normalizedEmail, input);
        } else {
          // Fallback: just add the name response and continue
          addUserResponse({ key: 'full_name', value: input, type: 'text' });
          processNextQuestion();
        }
      } else if (currentStage === ChatStage.DYNAMIC_QUESTIONS) {
        const questions = getFilteredQuestions();
        const currentQuestion = questions[currentQuestionIndex];

        addUserResponse({
          key: currentQuestion.key,
          value: input,
          type: currentQuestion.type
        });

        // Check if current question has action buttons (like "next" or "add to collection")
        const hasActionButtons = currentQuestion.action &&
          Array.isArray(currentQuestion.action) &&
          currentQuestion.action.length > 0 &&
          currentQuestion.action.some((actionItem: any) => {
            if (typeof actionItem === 'string') {
              return actionItem.trim() !== '';
            } else if (actionItem && typeof actionItem === 'object') {
              return actionItem.key && actionItem.key.trim() !== '';
            }
            return false;
          });

        if (hasActionButtons) {
          // Show response message first, then show action buttons
          if (currentQuestion.response_message && currentQuestion.response_message.trim()) {
            setTimeout(() => {
              addMessage({
                type: 'bot',
                content: currentQuestion.response_message!,
                action: currentQuestion.action?.map((actionItem: any) => 
                  typeof actionItem === 'string' ? actionItem : actionItem.key || ''
                ) || [],
                action_type: 'button'
              });
            }, 1000);
          } else {
            // No response message, show action buttons immediately
            setTimeout(() => {
              addMessage({
                type: 'bot',
                content: '',
                action: currentQuestion.action?.map((actionItem: any) => 
                  typeof actionItem === 'string' ? actionItem : actionItem.key || ''
                ) || [],
                action_type: 'button'
              });
            }, 500);
          }
        } else {
          // No action buttons, automatically advance to next question
          const nextQuestionIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextQuestionIndex);

          setTimeout(() => {
            processNextQuestion(nextQuestionIndex);
          }, 500);
        }
      }

      setIsProcessing(false);
    }, 1000);
  }, [currentStage, currentQuestionIndex, userResponses, addMessage, addUserResponse, processNextQuestion, getFilteredQuestions, handleNewUserRegistration]);

  const handleExistingUser = useCallback(async (email: string, fullName: string) => {
    try {
      // Get user data from validateByEmail API to ensure we have the most up-to-date information
      const userValidationData = await userApi.validateByEmail(email);
      
      // Use user_name from API if available, otherwise fallback to provided fullName
      const userName = userValidationData?.user_name || fullName;
      
      // Update userInfo state for existing user
      setUserInfo({
        user_id: userValidationData?.user_id,
        user_name: userName,
        _id: userValidationData?._id
      });
      
      // Add user responses without showing user messages
      addUserResponse({ key: 'emailId', value: email, type: 'text' });
      addUserResponse({ key: 'full_name', value: userName, type: 'text' });

      // Move directly to next questions
      setTimeout(() => {
        processNextQuestion();
      }, 1000);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Fallback to original behavior
      addUserResponse({ key: 'emailId', value: email, type: 'text' });
      addUserResponse({ key: 'full_name', value: fullName, type: 'text' });

      setTimeout(() => {
        processNextQuestion();
      }, 1000);
    }
  }, [addUserResponse, processNextQuestion]);

  const handleAddToCollection = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // Get user info
      const emailResponse = userResponses.find(response => response.key === 'emailId');
      if (!emailResponse?.value || typeof emailResponse.value !== 'string') {
        throw new Error('User email not found');
      }

      // Get user info to get user_id using validateByEmail API
      const userValidationData = await userApi.validateByEmail((emailResponse.value as string).trim().toLowerCase());
      if (!userValidationData?.user_id) {
        throw new Error('User ID not found');
      }

      // Get the current question to find the recently uploaded images
      const questions = getFilteredQuestions();
      const currentQuestion = questions[currentQuestionIndex];
      
      // Find the most recent uploaded images from the current question
      const recentImageResponse = userResponses.find(response => 
        response.key === currentQuestion.key && 
        (response.type === 'upload file' || 
         (typeof response.value === 'string' && response.value.startsWith('http')))
      );

      if (!recentImageResponse) {
        throw new Error('No recently uploaded images found to add to collection');
      }

      // Extract image URLs from the recent upload (handle both single URLs and multiple URLs separated by '|')
      const recentImageUrls: string[] = [];
      const value = recentImageResponse.value as string;
      if (value.includes('|')) {
        // Multiple URLs separated by '|'
        recentImageUrls.push(...value.split('|').filter(url => url.trim()));
      } else {
        // Single URL
        recentImageUrls.push(value);
      }

      if (recentImageUrls.length === 0) {
        throw new Error('No valid image URLs found in recent uploads');
      }

      // Use the first image for description
      const firstImageUrl = recentImageUrls[0];
      
      // Step 1: Get image description
      const imageDescription = await collectionApi.getImageDescription(firstImageUrl);

      console.log('imageDescription', imageDescription.title);
      
      // Step 2: Create collection
      const collectionResult = await collectionApi.createCollection({
        first_image: firstImageUrl,
        user_id: userValidationData.user_id,
        domain_store: eventData?.store_name || '',
        description: imageDescription.description,
        collection_name: imageDescription.title
      });

      if (!collectionResult._id) {
        throw new Error('Failed to create collection');
      }

      // Step 3: Add handpicked products using only the recently uploaded images
      const productLists = recentImageUrls.map((url, index) => ({
        name: `Image ${index + 1}`,
        image: url
      }));

      const success = await collectionApi.addHandpickedProducts({
        collection_id: collectionResult._id,
        store: eventData?.store_name || '',
        product_lists: productLists
      });

      if (success) {
        addMessage({
          type: 'bot',
          content: `Great! Your collection "${imageDescription.title}" has been created successfully`
        });
        
        // Continue to next question after collection creation
        setTimeout(() => {
          const nextQuestionIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextQuestionIndex);
          processNextQuestion(nextQuestionIndex);
        }, 1500);
      } else {
        throw new Error('Failed to add products to collection');
      }

    } catch (error) {
      console.error('Add to collection error:', error);
      addMessage({
        type: 'bot',
        content: "I'm sorry, there was an issue adding your images to the collection. Please try again."
      });
    } finally {
      setIsProcessing(false);
    }
  }, [userResponses, addMessage, currentQuestionIndex, processNextQuestion, getFilteredQuestions]);

  // Function to save user info with event_details using the API service
  const saveUserInfoWithEventDetails = useCallback(async (paymentStatus: 'pending' | 'success' | 'failure') => {
    const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userIdBadge") : null;
    
    if (!storedUserId || !eventData?.service_id) {
      console.log('Missing userId or eventId for saving user info');
      return;
    }

    await userApi.saveUserInfoWithEventDetails({
      userId: storedUserId,
      eventId: eventData.service_id,
      currentGroup: eventData.current_group,
      paymentStatus
    });
  }, [eventData]);

  const handlePaymentProceed = useCallback((paymentLink: string) => {
    console.log('=== PAYMENT PROCEED CLICKED ===');
    console.log('Payment link:', paymentLink);
    
    // Save user ID to localStorage before redirecting
    if (userInfo.user_id) {
      localStorage.setItem('userIdBadge', userInfo.user_id);
      console.log('Saved userId to localStorage:', userInfo.user_id);
    } else {
      console.warn('No user_id available to save to localStorage');
    }
    
    // Open payment link immediately (don't wait for API call)
    window.open(paymentLink, '_blank');
    
    // Save user info with pending payment status in background (don't await)
    saveUserInfoWithEventDetails('pending').catch(error => {
      console.error('Failed to save user info:', error);
    });
    
    // Add user response for payment selection
    const questions = getFilteredQuestions();
    const currentQuestion = questions[currentQuestionIndex];
    
    if (currentQuestion) {
      addUserResponse({
        key: currentQuestion.key,
        value: paymentLink,
        type: 'payment_details'
      });
    }
    
    // Advance to next question
    const nextQuestionIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextQuestionIndex);
    
    setTimeout(() => {
      processNextQuestion(nextQuestionIndex);
    }, 500);
    
    console.log('=== PAYMENT PROCEED COMPLETE ===');
  }, [currentQuestionIndex, addUserResponse, processNextQuestion, getFilteredQuestions, userInfo.user_id, saveUserInfoWithEventDetails]);

  const handleButtonResponse = useCallback(async (input: string) => {
    console.log('=== BUTTON RESPONSE DEBUG ===');
    console.log('Button input received:', input);
    console.log('Current question index:', currentQuestionIndex);
    console.log('Current stage:', currentStage);
    console.log('Is processing:', isProcessing);
    
    const questions = getFilteredQuestions();
    console.log('Total questions:', questions.length);
    console.log('Current question:', questions[currentQuestionIndex]);
    console.log('Next question index would be:', currentQuestionIndex + 1);
    if (questions[currentQuestionIndex + 1]) {
      console.log('Next question would be:', questions[currentQuestionIndex + 1]);
    } else {
      console.log('No next question - end of flow');
    }
    console.log('==============================');
    setIsProcessing(true);
    setIsFromButtonClick(true);

    // Process button responses without adding user messages
    setTimeout(async () => {
      // First handle email verification continue loop regardless of stage
      if (input.toLowerCase() === 'continue' && eventData?.user_signup_type === 'verify_email' && pendingEmailVerificationEmail) {
        try {
          const check = await userApi.validateByEmail(pendingEmailVerificationEmail);
          const status = (check?.status || '').toLowerCase();
          if (status === 'active') {
            const welcomeName = pendingEmailVerificationName || check?.user_name || 'there';
            addMessage({ type: 'bot', content: `Great! Welcome ${welcomeName}!` });
            // Clear pending state
            setPendingEmailVerificationEmail(null);
            setPendingEmailVerificationName(null);
            // Proceed to next question
            processNextQuestion();
          } else {
            // Show the same message again
            addMessage({
              type: 'bot',
              content: 'We have sent you a verification email. Once you have verified it, come back and click on Continue below.',
              action: ['Continue'],
              action_type: 'button'
            });
          }
        } catch (e) {
          addMessage({
            type: 'bot',
            content: 'Still waiting for email verification. Click Continue after verifying.'
          });
        }
        setIsProcessing(false);
        setIsFromButtonClick(false);
        return;
      }

      if (currentStage === ChatStage.DYNAMIC_QUESTIONS) {
        const questions = getFilteredQuestions();
        const currentQuestion = questions[currentQuestionIndex];

        console.log(`Button response for question ${currentQuestionIndex}:`, {
          key: currentQuestion.key,
          type: currentQuestion.type,
          response: input,
          action: currentQuestion.action
        });

        // Check if this is an "add to collection" action
        if (input.toLowerCase().includes('add to collection') || input.toLowerCase().includes('collection')) {
          await handleAddToCollection();
          setIsProcessing(false);
          setIsFromButtonClick(false);
          return;
        }

        // Check if this is a "skip" action
        if (input.toLowerCase() === 'skip') {
          // Remove any pending response messages that might show "Add to Collection"
          setMessages(prev => prev.filter(msg => 
            !msg.content?.toLowerCase().includes('add to collection') && 
            !msg.content?.toLowerCase().includes('collection')
          ));
          
          const nextQuestionIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(nextQuestionIndex);

          setTimeout(() => {
            processNextQuestion(nextQuestionIndex);
          }, 500);
          setIsProcessing(false);
          setIsFromButtonClick(false);
          return;
        }

        // Check if this is a "next" action for show_collection
        if (input.toLowerCase() === 'next') {
          console.log('=== NEXT BUTTON CLICKED ===');
          const nextQuestionIndex = currentQuestionIndex + 1;
          console.log('Moving from question', currentQuestionIndex, 'to', nextQuestionIndex);
          console.log('Setting currentQuestionIndex to:', nextQuestionIndex);
          setCurrentQuestionIndex(nextQuestionIndex);

          setTimeout(() => {
            console.log('Calling processNextQuestion with index:', nextQuestionIndex);
            processNextQuestion(nextQuestionIndex);
          }, 500);
          setIsProcessing(false);
          setIsFromButtonClick(false);
          console.log('=== NEXT BUTTON PROCESSING COMPLETE ===');
          return;
        }

        // For other action buttons, we don't store a response
        // Just advance to the next question
        console.log('=== OTHER ACTION BUTTON CLICKED ===');
        console.log('Action:', input);
        const nextQuestionIndex = currentQuestionIndex + 1;
        console.log('Moving from question', currentQuestionIndex, 'to', nextQuestionIndex);
        setCurrentQuestionIndex(nextQuestionIndex);

        setTimeout(() => {
          console.log('Calling processNextQuestion with index:', nextQuestionIndex);
          processNextQuestion(nextQuestionIndex);
        }, 500);
        setIsProcessing(false);
        setIsFromButtonClick(false);
        console.log('=== OTHER ACTION PROCESSING COMPLETE ===');
        return;
      }

      // Fallback: reset processing state if no conditions were met
      setIsProcessing(false);
      setIsFromButtonClick(false);
    }, 1000);
  }, [currentStage, currentQuestionIndex, addMessage, addUserResponse, getFilteredQuestions, submitRegistration, handleAddToCollection]);

  return {
    messages,
    currentStage,
    currentQuestionIndex,
    userResponses,
    isProcessing,
    questions: getFilteredQuestions(),
    initializeChat,
    handleUserInput,
    handleFileUpload,
    handleButtonResponse,
    handleExistingUser,
    handleAddToCollection,
    handlePaymentProceed,
    addMessage,
    setCurrentStage,
    submitRegistration,
    addUserResponse,
    pendingQuestionIndex,
    userInfo,
    prepareExistingUserNameUpdate,
    hasShowCollection: () => {
      if (!eventData) return false;
      return eventData.admin_details.some(detail => detail.key === 'show_collection');
    }
  };
};