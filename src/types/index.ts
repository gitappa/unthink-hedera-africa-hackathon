export interface ActionDetail {
  key: string;
  position: string;
}

export interface AdminDetail {
  label: string;
  key: string;
  type: 'text' | 'upload file' | 'boolean' | 'multi select' | 'action' | 'image_text_template' | 'image_template' | 'text_template' | 'payment_details' | 'try on';
  message: string;
  value: string | string[] | object;
  mandatory: boolean;
  is_display: boolean;
  is_user_input: boolean;
  level: string[];
  group?: string[];
  options?: string[];
  action?: ActionDetail[];
  action_type?: string;
  response_message?: string;
  // Optional hint image URL for try on or other steps
  hint?: string;
}

export interface EventData {
  _id: string;
  store_id: string;
  store_name: string;
  user_name: string;
  user_id: string;
  feature_id: string;
  feature_name: string;
  service_id: string;
  service_name: string;
  group_category: string;
  current_group: string;
  bot_image?: string;
  // Signup configuration (parent-level keys)
  user_signup_type?: 'active' | 'verify_email';
  email_verification_signature_text?: string;
  email_verification_signature_domain_link?: string;
  creator_emailId?: string;
  agent_url: {
    main_url: string;
    mapped_url: string;
    event_url?: string;
    admin_url?: string;
    chat_link?: string;
  };
  admin_details: AdminDetail[];
  badge_template?: {
    value: {};
  };
}

export interface ChatMessage {
  id: string;
  type: 'bot' | 'user' | 'banner';
  content: string;
  timestamp: Date;
  url?: string;
  inputType?: 'text' | 'upload' | 'boolean' | 'multiselect' | 'submit' | 'virtual_tryon';
  options?: string[];
  mandatory?: boolean;
  action?: string[];
  action_type?: string;
  response_message?: string;
  isShowCollection?: boolean;
  collectionLink?: string;
  isBadgePreview?: boolean;
  badgeImageUrl?: string;
  badgeUserName?: string;
  // New template types support
  templateType?: 'image_text_template' | 'image_template' | 'text_template';
  templateValue?: {
    bg_image: string;
    type: string;
    image_coordinates?: Array<{ point: [number, number]; radius: number }>;
    text_coordinates?: Array<{ point: [number, number] }>;
  };
  // Payment details support
  isPaymentDetails?: boolean;
  paymentValue?: Record<string, {
    label: string;
    key: string;
    type: string;
    value: number;
    currency: string;
    is_enable: boolean;
    payment_link: string;
  }>;
  paymentAction?: string[];
  // Try-on support
  tryOnContext?: {
    store: string;
    serviceId: string;
    prompt: string;
    maxImages: number;
    hint?: string;
  };
}

export interface UserResponse {
  key: string;
  value: string | string[] | boolean;
  type: string;
}

export enum ChatStage {
  LOADING = 'loading',
  BANNER = 'banner',
  WELCOME = 'welcome',
  EMAIL = 'email',
  NAME = 'name',
  DYNAMIC_QUESTIONS = 'dynamic_questions',
  PHOTO = 'photo',
  READY_TO_SUBMIT = 'ready_to_submit',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ApiResponse<T> {
  status: 'Success' | 'success'| 'error';
  data: T;
  message?: string;
}

export interface UserValidationData {
  first_name?: string;
  last_name?: string;
  email?: string;
  user_name?: string;
  is_influencer?: boolean;
  _id?: string;
  user_id?: string;
  register_source?: string[];
  store?: string;
  status?: string;
  [key: string]: any;
}

export interface UploadResponse {
  url: string;
}