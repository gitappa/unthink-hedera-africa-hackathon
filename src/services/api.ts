import axios from 'axios';
import type { AxiosResponse } from 'axios';
import type { EventData, ApiResponse, UserValidationData, UploadResponse } from '../types';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: 'https://auraprod.unthink.ai',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Event API functions
export const eventApi = {
  /**
   * Fetch event configuration by event ID
   */
  getEventById: async (eventId: string): Promise<EventData> => {
    try {
      const response: AxiosResponse<ApiResponse<EventData>> = await api.get(`/agent_collection/get/service_id/${eventId}`);

      if (response.data.status === 'success') {
        console.log('he', response.data.data)
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch event data');
      }
    } catch (error) {
      console.error('Event API Error:', error);
      throw new Error('Failed to load event. Please check your connection and try again.');
    }
  },

  /**
   * Submit final registration data
   */
  submitRegistration: async (registrationData: Record<string, any>): Promise<boolean> => {
    try {
      const payload: any = {
        _id: registrationData._id,
        user_id: registrationData.user_id,
        user_name: registrationData.user_name,
        emailId: registrationData.emailId,
        is_influencer: registrationData.is_influencer || false,
        register_source: registrationData.register_source,
        event_details: {
          [`${registrationData.register_source} (${registrationData.current_group})`]: registrationData.event_details
        }
      };

      const response: AxiosResponse<ApiResponse<any>> = await api.post(`/users/save_user_info/`, payload);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Registration submission error:', error);
      throw new Error('Failed to submit registration. Please try again.');
    }
  },

  /**
   * Submit profile image and user name data
   */
  submitProfileImage: async (profileData: Record<string, any>): Promise<boolean> => {
    try {
      const payload: any = {
        _id: profileData._id,
        user_id: profileData.user_id,
        user_name: profileData.user_name,
        emailId: profileData.emailId,
        is_influencer: profileData.is_influencer || false,
        profile_image: profileData.profile_image,
        first_name: profileData.first_name,
        last_name: profileData.last_name
      };

      const response: AxiosResponse<ApiResponse<any>> = await api.post(`/users/save_user_info/`, payload);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Profile image submission error:', error);
      throw new Error('Failed to submit profile image. Please try again.');
    }
  },

  /**
   * Send admin notification email
   */
  sendAdminNotification: async (emailData: {
    to_email: string;
    subject: string;
    message: string;
    signature_text: string;
  }): Promise<boolean> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await api.post('/users/send_email/', emailData);

      return response.data.status === 'success';
    } catch (error) {
      console.error('Admin notification email error:', error);
      throw new Error('Failed to send admin notification email. Please try again.');
    }
  }
};

// User API functions
export const userApi = {
  /**
   * Validate user by email and get existing data
   */
  validateByEmail: async (email: string): Promise<UserValidationData | null> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response: AxiosResponse<ApiResponse<UserValidationData>> = await axios.get(`https://auraprod.unthink.ai/users/get_user_info/?emailId=${normalizedEmail}`)

      if (response.data.status === 'success') {
        console.log('respons1', response.data.data)
        return response.data.data;
      } else {
        // User not found is not an error - return null
        return null;
      }
    } catch (error) {
      // Don't throw error for user not found - just return null
      console.log('User validation:', error);
      return null;
    }
  },

  /**
   * Register new user
   */
  registerUser: async (userData: {
    emailId: string;
    user_name: string;
    name: string;
    register_source: string;
    store: string;
    // optional fields for verify_email flow
    is_agent?: boolean;
    signature_text?: string;
    signature_domain_link?: string;
    trial_user?: boolean;
  }): Promise<{ user_id: string; user_name: string } | null> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await api.post('/users/sign_up/', {
        password: userData.emailId, // Using email as password as per requirements
        emailId: userData.emailId,
        user_name: userData.user_name,
        register_source: userData.register_source,
        full_name: userData.name,
        store: userData.store,
        // include extended fields when provided
        is_agent: userData.is_agent,
        signature_text: userData.signature_text,
        signature_domain_link: userData.signature_domain_link,
        trial_user: userData.trial_user
      });

      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('User registration error:', error);
      throw new Error('Failed to register user. Please try again.');
    }
  },

  /**
   * Get user info by email
   */
  getUserInfo: async (email: string): Promise<{ user_id: string; user_name: string; _id?: string; is_influencer?: boolean } | null> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response: AxiosResponse<ApiResponse<any>> = await api.get(`/users/get_user_info/?emailId=${normalizedEmail}`);

      if (response.data.status === 'success') {
        return {
          user_id: response.data.data.user_id,
          user_name: response.data.data.user_name,
          _id: response.data.data._id,
          is_influencer: response.data.data.is_influencer || false
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Get user info error:', error);
      return null;
    }
  },

  /**
   * Verify user
   */
  verifyUser: async (userId: string, storeName?: string): Promise<boolean> => {
    try {
      const hostBase = storeName
        ? `https://unthink-ui-gatsby-${storeName}-ui-314035436999.us-central1.run.app/`
        : (typeof window !== 'undefined' ? window.location.origin + '/' : '');
      const response: AxiosResponse<ApiResponse<any>> = await api.get(`/users/verify/?user_id=${userId}&host=${encodeURIComponent(hostBase)}`);
      console.log('respons2', response.data.data)
      return response.data.status === 'success';
    } catch (error) {
      console.error('User verification error:', error);
      return false;
    }
  },

  /**
   * Save user info with register source
   */
  saveUserInfo: async (userData: {
    _id: string;
    user_id: string;
    is_influencer: boolean;
    register_source: string;
    store?: string;
  }): Promise<boolean> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await axios.post('https://auraprod.unthink.ai/users/save_user_info/', userData);
      return response.data.status === 'success';
    } catch (error) {
      console.error('Save user info error:', error);
      return false;
    }
  },

  /**
   * Save/update user's name for an existing account
   */
  saveUserName: async (params: {
    _id: string;
    user_id: string;
    name: string;
    is_influencer?: boolean;
  }): Promise<boolean> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await axios.post('https://auraprod.unthink.ai/users/save_user_info/', {
        _id: params._id,
        user_id: params.user_id,
        is_influencer: params.is_influencer ?? true,
        full_name: params.name
      });
      return response.data.status === 'success';
    } catch (error) {
      console.error('Save user name error:', error);
      return false;
    }
  },

  /**
   * Save user info with event details (payment status)
   */
  saveUserInfoWithEventDetails: async (params: {
    userId: string;
    eventId: string;
    currentGroup?: string;
    paymentStatus: 'pending' | 'success' | 'failure';
  }): Promise<boolean> => {
    try {
      const { userId, eventId, currentGroup = 'default', paymentStatus } = params;
      
      if (!userId || !eventId) {
        console.log('Missing userId or eventId for saving user info');
        return false;
      }

      const service_id = `${eventId} (${currentGroup})`;
      
      // First, get existing user data
      const userRes = await fetch(
        `https://auraprod.unthink.ai/users/get_user_info/?user_id=${encodeURIComponent(userId)}`,
        { method: "GET" }
      );

      let existingEventDetails: { [key: string]: any[] } = {};
      let is_influencer = false;
      let m_id = null;

      if (userRes.ok) {
        const userData = await userRes.json();
        m_id = userData?.data?._id;
        is_influencer = userData?.data?.is_influencer;
        existingEventDetails = userData?.data?.event_details || {};
      }

      // Update event_details based on existing data
      let updatedEventDetails: { [key: string]: any[] } = { ...existingEventDetails };
      
      if (!updatedEventDetails[service_id]) {
        // No data for this event ID, create new entry
        updatedEventDetails[service_id] = [{
          key: "payment_status",
          value: [paymentStatus]
        }];
      } else {
        // Data exists for this event ID, find the payment_status entry
        const eventDataArray = updatedEventDetails[service_id];
        const paymentStatusIndex = eventDataArray.findIndex((entry: any) => entry.key === "payment_status");
        
        if (paymentStatusIndex !== -1) {
          // Payment status entry exists, check if transition is allowed
          const currentStatus = eventDataArray[paymentStatusIndex].value[eventDataArray[paymentStatusIndex].value.length - 1];
          
          // Prevent transitions from 'failure' or 'success' to 'pending'
          if ((currentStatus === 'failure' || currentStatus === 'success') && paymentStatus === 'pending') {
            console.log(`Cannot change payment status from '${currentStatus}' to 'pending'`);
            return false;
          }
          
          // Update the last payment status instead of appending
          updatedEventDetails[service_id][paymentStatusIndex].value = [paymentStatus];
        } else {
          // No payment status entry exists, create new one
          updatedEventDetails[service_id] = [...eventDataArray, {
            key: "payment_status",
            value: [paymentStatus]
          }];
        }
      }

      // Save the updated user info
      const saveRes = await fetch(
        "https://auraprod.unthink.ai/users/save_user_info/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            _id: m_id,
            user_id: userId,
            is_influencer: is_influencer,
            event_details: updatedEventDetails
          })
        }
      );

      if (saveRes.ok) {
        console.log('User info saved successfully with event details');
        return true;
      } else {
        console.error('Failed to save user info:', await saveRes.text());
        return false;
      }
    } catch (error) {
      console.error('Error saving user info:', error);
      return false;
    }
  }
};

// Upload API functions
export const uploadApi = {
  /**
   * Upload file and get URL
   */
  uploadFile: async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response: AxiosResponse<ApiResponse<UploadResponse>> = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });

      if (response.data.status === 'success') {
        return response.data.data.url;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error('Upload failed. Please try again.');
    }
  }
};

// Collection API functions
export const collectionApi = {
  /**
   * Get image description from image URL
   */
  getImageDescription: async (imageUrl: string): Promise<{ description: string; title: string }> => {
    try {
      const response: AxiosResponse<ApiResponse<{ description: string; title: string }>> = await axios.post('https://auraprod.unthink.ai/cs/imagetodescription/', {
        image_url: imageUrl,
        image_text: "the product given in the image is: some image and this is the guidelines from the seller of the products: Describe the image 3 to 4 sentence. and this is sellers brand profile just for reference: ",
        tt_id: "",
        sid: "",
        store: "fashiondemo"
      });

      if (response.data.status === 'success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to get image description');
      }
    } catch (error) {
      console.error('Image description error:', error);
      throw new Error('Failed to get image description. Please try again.');
    }
  },

  /**
   * Create a new collection
   */
  createCollection: async (collectionData: {
    first_image: string;
    user_id: string;
    domain_store: string;
    description: string;
    collection_name: string;
  }): Promise<any> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await axios.post('https://auraprod.unthink.ai/user/collections/create_collection/', {
        user_id: collectionData.user_id,
        type: "custom_plist",
        tags: [],
        keyword_tag_map: {},
        description: collectionData.description,
        collection_name: collectionData.collection_name,
        cover_image: collectionData.first_image,
        generated_by: "desc_based",
        blog_url: "",
        domain_store: collectionData.domain_store,
        status: "published"
      });

      if (response.data.status === 'Success') {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create collection');
      }
    } catch (error) {
      console.error('Collection creation error:', error);
      throw new Error('Failed to create collection. Please try again.');
    }
  },

  /**
   * Add handpicked product list to collection
   */
  addHandpickedProducts: async (productData: {
    collection_id: string;
    store: string;
    product_lists: Array<{ name: string; image: string }>;
  }): Promise<boolean> => {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await axios.post('https://auraprod.unthink.ai/user/collections/handpicked_product_list/', {
        collection_id: productData.collection_id,
        store: productData.store,
        status: "published",
        product_lists: productData.product_lists
      });

      return response.data.status === 'success';
    } catch (error) {
      console.error('Add handpicked products error:', error);
      throw new Error('Failed to add products to collection. Please try again.');
    }
  }
};

// Try-On API
export const tryOnApi = {
  /**
   * Send image URLs to try-on service and get the generated image URL
   */
  tryOn: async (params: { image_urls: string[]; store: string; service_id: string; image_tryon_prompt: string }): Promise<string> => {
    try {
      const response = await axios.post('https://aurastage.unthink.ai/cs/image_tryon/', params, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = response?.data;
      // Expecting { status, data: { image_url: string } }
      const imageUrl = data?.data?.image_url;
      if (!imageUrl) {
        throw new Error('Try-on failed');
      }
      return imageUrl;
    } catch (error) {
      console.error('Try-On API Error:', error);
      throw new Error('Virtual Try-On failed. Please try again.');
    }
  }
};

// Health check function
export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

// Export the configured axios instance for custom requests
export { api };

// Default export with all API functions
export default {
  event: eventApi,
  user: userApi,
  upload: uploadApi,
  collection: collectionApi,
  healthCheck,
};