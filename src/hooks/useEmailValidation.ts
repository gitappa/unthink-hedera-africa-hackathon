import { useState } from 'react';
import type { UserValidationData } from '../types';
import { userApi, eventApi } from '../services/api';

export const useEmailValidation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    // Always validate using a normalized lowercase value
    email = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkUserByEmail = async (email: string, eventId?: string): Promise<UserValidationData | null> => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const userData = await userApi.validateByEmail(normalizedEmail);
      
      // If user exists and eventId is provided, check register_source and store
      if (userData && eventId && userData._id && userData.user_id) {
        const registerSource = userData.register_source || [];
        const needsRegisterSourceUpdate = !registerSource.includes(eventId);

        // Determine store value: if userData.store is missing, fetch from event
        let storeToSet: string | undefined = undefined;
        if (!userData.store) {
          try {
            const eventData = await eventApi.getEventById(eventId);
            storeToSet = eventData?.store_name;
          } catch (e) {
            console.warn('Failed to fetch event for store info', e);
          }
        }

        if (needsRegisterSourceUpdate || storeToSet) {
          console.log('Updating user info with register_source/store');
          const updateSuccess = await userApi.saveUserInfo({
            _id: userData._id,
            user_id: userData.user_id,
            is_influencer: userData.is_influencer || false,
            register_source: eventId,
            ...(storeToSet ? { store: storeToSet } : {})
          });

          if (updateSuccess) {
            if (needsRegisterSourceUpdate) {
              userData.register_source = [...registerSource, eventId];
            }
            if (storeToSet) {
              userData.store = storeToSet;
            }
          } else {
            console.warn('Failed to update user info');
          }
        }
      }
      
      return userData;
    } catch (err) {
      console.error('Email validation error:', err);
      // Don't set error for user not found - just return null
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (userData: UserValidationData): string | null => {
    if (userData.first_name && userData.last_name) {
      return `${userData.first_name} ${userData.last_name}`.trim();
    }

    if (userData.first_name) {
      return userData.first_name.trim();
    }
    
    if (userData.name) {
      return userData.name.trim();
    }
    
    return null;
  };

  return {
    validateEmail,
    checkUserByEmail,
    getFullName,
    loading,
    error,
    clearError: () => setError(null)
  };
};