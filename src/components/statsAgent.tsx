import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area';
import {
  Send,
  Bot,
  User,
  Loader2,
  Square,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { saveAs } from 'file-saver';

// Message interface
export interface Message {
  type: 'user' | 'assistant';
  content: string;
  assistantId: string;
  isLoading?: boolean;
}

// Interfaces for event details processing
interface EventDetail {
  key: string;
  value: any[];
}

interface EventDetails {
  [key: string]: EventDetail[];
}

interface UserItem {
  emailId: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  register_source?: string[];
  event_details: EventDetails;
}

interface ProcessedRow {
  emailId: string;
  name: string;
  [key: string]: any;
}

const BACKEND_URL = "https://aurastage.unthink.ai";
const API_BASE_URL = "https://auraprod.unthink.ai";

export const api = axios.create({
  baseURL: `${BACKEND_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Production API instance for calls that need to go to production
const prodApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to process event details
const processEventDetails = async (serviceId: string): Promise<{ columns: string[], rows: ProcessedRow[] }> => {
  try {
    console.log('Making API call to /users/get_user_by_service with serviceId:', serviceId);
    const response = await prodApi.get(`/users/get_user_by_service?service_id=${serviceId}`);
    console.log('get_user_by_service response status:', response.status);
    const data = response.data;
    if (!data || !Array.isArray(data.data)) {
      console.warn('Unexpected payload for get_user_by_service:', data);
      return { columns: [], rows: [] }; // Return empty on bad data
    }

    const items: UserItem[] = data.data;
    
    const allColumns = new Set<string>(['emailId', 'name']);
    const allRows: ProcessedRow[] = [];

    for (const item of items) {
      const eventDetails = item.event_details || {};

      // NEW: Filter out users with a yopmail address
      const email = item.emailId || '';
      if (typeof email === 'string' && email.endsWith("yopmail.com")) {
        continue;
      }
      
      // NEW: More robust name creation
      const constructedName = [item.first_name, item.last_name]
        .filter(Boolean) // Removes null, undefined, or empty strings
        .join(' ')
        .trim();
      
      const rowData: ProcessedRow = {
        emailId: email,
        name: constructedName || item.name || ''
      };

      if (!eventDetails || Object.keys(eventDetails).length === 0) {
        const registerSource = item.register_source || [];
        if (registerSource.includes(serviceId)) {
          allRows.push(rowData);
        }
        continue; // Move to the next item
      }

      const serviceKey = Object.keys(eventDetails).find(k => k.startsWith(serviceId));
      if (!serviceKey) {
        continue;
      }
      
      const detailsList = eventDetails[serviceKey] || [];
      if (!Array.isArray(detailsList)) {
        continue;
      }

      for (const detail of detailsList) {
        const key = detail.key;
        if (!key) continue;
        
        const vals = detail.value || [];
        const value = vals.length > 0 ? vals.join("|") : null;
        
        rowData[key] = value;
        allColumns.add(key);
      }
      
      allRows.push(rowData);
    }
    
    const result = {
      columns: Array.from(allColumns),
      rows: allRows
    };
    console.log('Processed payload summary:', { columnCount: result.columns.length, rowCount: result.rows.length });
    return result;

  } catch (error: any) {
    console.error('Error processing event details:', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data
    });
    throw error;
  }
};

// Function to convert data to CSV and download
const downloadCSV = (columns: string[], rows: ProcessedRow[]) => {
  // Create CSV content
  const csvContent = [
    columns.join(','),
    ...rows.map(row =>
      columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  const datetime = new Date()
    .toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/[\/,: ]/g, '_');

  saveAs(blob, `user_information_${datetime}.csv`);
};

export async function streamResponse(
  text: string,
  userId: string, 
  assistantId: string, 
  sessionId: string,
  messageHistory: Message[]
): Promise<ReadableStream> {
  const response = await api.post('/chat_agent/chat', {
    message: text,
    user_id: userId,
    assistant_id: assistantId,
    session_id: sessionId,
    chat_history: messageHistory
  }, {
    responseType: 'text',
  });
  
  return response as any as ReadableStream;
}

const CustomLink = (props: any) => (
  <a
    href={props.href}
    target="_blank"
    rel="noopener noreferrer"
    className="text-purple-600 hover:underline inline-flex items-center gap-1 font-medium"
  >
    {props.children}
  </a>
);


const LoadingIndicator = () => (
  <div className="flex items-center space-x-2 animate-pulse">
    <span className="text-sm text-purple-500">Analyzing…</span>
  </div>
);

const EnhancedMessageItem: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.type === 'user';
  const Icon = isUser ? User : Bot;
  const isLoading = message.isLoading === true;
  const showInitialLoadingIndicator = isLoading && message.content.length === 0;

  return (
    <div
      className={cn(
        'flex items-start gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple-500" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[85%] rounded-2xl p-4 shadow-lg',
          isUser
            ? 'bg-purple-200 text-purple-800 rounded-br-none'
            : 'bg-white bg-opacity-80 rounded-bl-none'
        )}
      >
        {showInitialLoadingIndicator ? (
          <LoadingIndicator />
        ) : (
          <>
            <div className="prose prose-sm text-gray-800 break-words max-w-full">
              <ReactMarkdown
                components={{
                a: CustomLink,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                pre: ({ children }) => (
                  <pre className="bg-gray-100 rounded p-3 my-2 overflow-x-auto text-sm font-mono">
                    {children}
                  </pre>
                ),
                code: ({ inline, className, children, ...props }: any) =>
                  inline ? (
                    <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className={cn('font-mono text-sm bg-gray-100 p-2 rounded', className)} {...props}>
                      {children}
                    </code>
                  ),
                }}  
              >
                {message.content + (isLoading && !showInitialLoadingIndicator ? '▍' : '')}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center shadow-inner">
          <Icon className="w-5 h-5 text-purple-800" />
        </div>
      )}
    </div>
  );
};

export default function StatsAgent() {
  const { eventId } = useParams<{ eventId: string }>();
  const userId = eventId || 'default';
  
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [menuItems, setMenuItems] = useState([{
    label: '',
    url: ''
  }]);
  const [welcomeMessage, setWelcomeMessage] = useState('Hi, how can i help you today?');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);

  const stopStreamingRef = useRef(false);

  // Function to fetch service data from API
  const fetchServiceData = async (serviceId: string) => {
    try {
      console.log('Fetching service data for serviceId:', serviceId);
      const response = await prodApi.get(`/agent_collection/get/service_id/${serviceId}/`);
      console.log('agent_collection response status:', response.status);
      const data = response.data.data;
      if (!data) {
        console.warn('Empty service data for serviceId:', serviceId, 'raw:', response.data);
      }
      
      if (data?.admin_details && Array.isArray(data.admin_details)) {
        const welcomeNote = data.admin_details.find((item: any) => item.key === 'welcome_note');
        if (welcomeNote?.value) {
          setWelcomeMessage("Hi, how can i help you today?");
        }
        
        const bookingDetails = data.admin_details.find((item: any) => item.key === 'booking_link');
        if (bookingDetails?.value) {
          const menuLabel = bookingDetails.action[0];
          setMenuItems([{
            label: menuLabel,
            url: bookingDetails.value
          }]);
        }

        const suggestionList = data.admin_details.find((item: any) => item.key === 'suggestion_list');
        if (suggestionList?.value && Array.isArray(suggestionList.value)) {
          setSuggestions(suggestionList.value);
        }

        const welcomeBanner = data.admin_details.find((item: any) => item.key === 'welcome_banner');
        if (welcomeBanner?.value) {
          setBannerUrl(welcomeBanner.value);
        }
      }
    } catch (error: any) {
      console.error('Error fetching service data:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      // Set fallback welcome message if API fails
      setWelcomeMessage("Hi, how can i help you today?");
    }
  };

  

  useEffect(() => {
    setSessionId(crypto.randomUUID().slice(0, 8));
    
    // Set default suggestions as fallback

     // Fetch service data using the chatagentid as service_id
     if (userId && userId !== 'default') {
       fetchServiceData(userId);
     } 
  }, [userId]);

  // Update messages when welcome message changes
  useEffect(() => {
    if (welcomeMessage) {
      setMessages([
        { type: 'assistant', content: welcomeMessage, assistantId: '', isLoading: false }
      ]);
    }
  }, [welcomeMessage]);

  useEffect(() => {
    const vp = scrollAreaViewportRef.current;
    if (vp) setTimeout(() => { vp.scrollTop = vp.scrollHeight; }, 50);
  }, [messages]);


  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleStopStreaming = () => { stopStreamingRef.current = true; };

  const handleDownloadUserData = async () => {
    if (!userId || userId === 'default' || isDownloading) return;
    
    setIsDownloading(true);
    try {
      const { columns, rows } = await processEventDetails(userId);
      console.log('Download CSV with sizes:', { columns: columns.length, rows: rows.length });
      downloadCSV(columns, rows);
    } catch (error) {
      console.error('Error downloading user data:', error);
      // You could add a toast notification here if you have a toast system
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { type: 'user', content: query, assistantId: '' };
    stopStreamingRef.current = false;
    setMessages(prev => [...prev, userMessage, { type: 'assistant', content: '', assistantId: '', isLoading: true }]);
    const history = [...messages, userMessage];
    setQuery('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      let assistantMessageText: string;
      const response = await streamResponse(query, userId, '', sessionId, history);
      const parsedData = JSON.parse((response as any).data);
      console.log(parsedData.response);
      assistantMessageText = parsedData.response;

      if (assistantMessageText.startsWith('hcs:/')) {
        assistantMessageText = 'Sorry, I was unable to process your query. Please try again.';
      }

      let i = 0;
      // Calculate word count to determine streaming speed
      const wordCount = assistantMessageText.split(/\s+/).filter(word => word.length > 0).length;
      // Use much faster speed (0.2ms) for messages with more than 100 words, otherwise use normal speed (2ms)
      const streamInterval = wordCount > 100 ? 0.5 : 2;
      
      while (i < assistantMessageText.length && !stopStreamingRef.current) {
        const slice = assistantMessageText.slice(0, i + 1);
        setMessages(prev => {
          const copy = [...prev];
          const lastIndex = copy.length - 1;
          if (lastIndex >= 0 && copy[lastIndex].type === 'assistant') {
            copy[lastIndex] = { ...copy[lastIndex], content: slice, isLoading: true };
          }
          return copy;
        });
        i++;
        await new Promise(r => setTimeout(r, streamInterval));
      }

      setMessages(prev => {
        const copy = [...prev];
        const lastIndex = copy.length - 1;
        if (lastIndex >= 0 && copy[lastIndex].type === 'assistant') {
          const finalContent = stopStreamingRef.current ? assistantMessageText.slice(0, i) : assistantMessageText;
          copy[lastIndex] = {
            ...copy[lastIndex],
            content: finalContent,
            isLoading: false,
          };
        }
        return copy;
      });
    } catch (err) {
      console.error("Error during chat submission or streaming:", err);
      setMessages(prev => {
        const copy = [...prev];
        const lastIndex = copy.length - 1;
        const errorMsg: Message = {
          type: 'assistant',
          content: "Sorry, couldn't process your request. Please try again or refresh the page.",
          assistantId: '',
          isLoading: false,
        };
        if (lastIndex >= 0 && copy[lastIndex].type === 'assistant') {
          copy[lastIndex] = errorMsg;
        } else {
          copy.push(errorMsg);
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      stopStreamingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Banner Image */}
      <div className="max-w-2xl mx-auto">
        <img
          src={bannerUrl || ''}
          alt="Event Banner"
          className="w-full rounded-lg shadow-lg"
          style={{ aspectRatio: '21 / 9', objectFit: 'cover' }}
        />
      </div>

      {/* Download User Data Button */}
      <div className="mt-3 text-center">
        <button
          onClick={handleDownloadUserData}
          disabled={isDownloading}
          className="text-purple-600 border-b border-purple-600 hover:text-purple-700 hover:border-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? 'Downloading...' : 'download user data'}
        </button>
      </div>

      {/* Menu Items as Buttons */}
      {menuItems.length > 0 && menuItems[0].url && (
          <div className="mt-3 text-center">
            {menuItems.map((item) => (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 border-b border-purple-600 hover:text-purple-600 hover:border-purple-600"
              >
                {item.label}
              </a>
            ))}
          </div>
      )}

        <main className="flex flex-col flex-1 h-full">
        <ScrollArea className="flex-1">
          <ScrollAreaPrimitive.Root className="flex-1">
            <ScrollAreaPrimitive.Viewport
              ref={scrollAreaViewportRef}
              className="flex-1 px-6 pt-2 pb-6"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg, i) => (
                  <div key={i}>
                    <EnhancedMessageItem message={msg} />
                    {i === 0 && msg.type === 'assistant' && !msg.isLoading && suggestions.length > 0 && (
                      <div className="pl-11 mt-2"> {/* Align with assistant message bubble */}
                        <div className="flex flex-wrap gap-2 pb-2">
                          {suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="rounded-full bg-white/50 border-purple-200 text-purple-700 hover:bg-purple-100/50 h-auto px-4 py-1.5"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                 ))}
               </div>
             </ScrollAreaPrimitive.Viewport>
             <ScrollAreaPrimitive.Scrollbar orientation="vertical" />
          </ScrollAreaPrimitive.Root>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        <div className="sticky bottom-0 left-0 right-0 border-t bg-white bg-opacity-70 backdrop-blur-md px-6 py-4 z-10">
          <div className="max-w-3xl mx-auto flex items-center">
            <form onSubmit={handleSubmit} className="flex gap-3 items-center w-full">
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 h-10 text-base rounded-full px-5 shadow-md bg-purple-50 focus:bg-white focus:ring-2 focus:ring-purple-300 disabled:opacity-70"
                disabled={isLoading}
                autoComplete="off"
              />
              {isStreaming ? (
                <Button
                  type="button"
                  onClick={handleStopStreaming}
                  size="icon"
                  variant="ghost"
                  className="rounded-full w-10 h-10 flex-shrink-0 text-gray-600 hover:bg-gray-200"
                  title="Stop generating"
                >
                  <Square className="w-5 h-5" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  size="icon"
                  className="rounded-full w-10 h-10 bg-purple-500 text-white hover:bg-purple-600 flex-shrink-0 disabled:bg-purple-300"
                >
                  {isLoading && !isStreaming
                    ? <Loader2 className="w-5 h-5 animate-spin text-white" />
                    : <Send className="w-5 h-5 text-white" />
                  }
                </Button>
              )}
            </form>
          </div>
        </div>
        </main>
    </div>
  );
}