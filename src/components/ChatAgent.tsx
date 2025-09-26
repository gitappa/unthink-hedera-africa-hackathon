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
import EventPage from './EventPage';

// Message interface
export interface Message {
  type: 'user' | 'assistant';
  content: string;
  assistantId: string;
  isLoading?: boolean;
}

// Embedded page interface
// interface EmbeddedPage {
//   [key: string]: string; // {"label": "event_id"}
// }

const BACKEND_URL = "https://aurastage.unthink.ai";
const API_BASE_URL = "https://auraprod.unthink.ai";

export const api = axios.create({
  baseURL: `${BACKEND_URL}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

const CustomLink = (props: any) => {
  const { href, children } = props;
  const sameTabDomains = [
    "https://tanilamb.req.chat",
    "https://eventapplication-314035436999.us-central1.run.app",
  ];

  const isSameTab = sameTabDomains.some((domain) => href && href.startsWith(domain));

  return (
    <a
      href={href}
      target={isSameTab ? "_self" : "_blank"}
      rel={isSameTab ? undefined : "noopener noreferrer"}
      className="text-purple-600 hover:underline inline-flex items-center gap-1 font-medium"
    >
      {children}
    </a>
  );
};


const LoadingIndicator = () => (
  <div className="flex items-center space-x-2 animate-pulse">
    <span className="text-sm text-purple-500">Analyzing…</span>
  </div>
);

const EnhancedMessageItem: React.FC<{ message: Message; botImageUrl?: string | null }> = ({ message, botImageUrl }) => {
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
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
          {botImageUrl ? (
            <img src={botImageUrl} alt="Bot" className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-5 h-5 text-purple-500" />
          )}
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

export default function ChatAgent() {
  const { chatagentid } = useParams<{ chatagentid: string }>();
  const userId = chatagentid || 'default';
  
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [botImageUrl, setBotImageUrl] = useState<string | null>(null);
  const [activeTab] = useState('chat');
  const [selectedEventId] = useState<string | null>(null);
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const stopStreamingRef = useRef(false);

  // Function to fetch service data from API
  const fetchServiceData = async (serviceId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/agent_collection/get/service_id/${serviceId}/`);
      const data = response.data.data;
      console.log('data', data);
      
      if (data?.admin_details && Array.isArray(data.admin_details)) {
        const welcomeNote = data.admin_details.find((item: any) => item.key === 'welcome_note');
        if (welcomeNote?.value) {
          setWelcomeMessage(welcomeNote.value);
        }

        const suggestionList = data.admin_details.find((item: any) => item.key === 'suggestion_list');
        if (suggestionList?.value && Array.isArray(suggestionList.value)) {
          setSuggestions(suggestionList.value);
        }

        const welcomeBanner = data.admin_details.find((item: any) => item.key === 'welcome_banner');
        if (welcomeBanner?.value) {
          setBannerUrl(welcomeBanner.value);
        }

        const botImage = data?.bot_image || null;
        if (botImage) {
          setBotImageUrl(botImage);
        } else {
          setBotImageUrl(null);
        }

        // Handle embedded pages
        // if (data.embedded_pages && Array.isArray(data.embedded_pages)) {
        //   console.log('Embedded pages:', data.embedded_pages);
        //   setEmbeddedPages(data.embedded_pages);
        // }
      }
    } catch (error) {
      console.error('Error fetching service data:', error);
      // Set fallback welcome message if API fails
      setWelcomeMessage("");
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
    requestAnimationFrame(() => {
      endOfMessagesRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    });
  }, [messages, isStreaming]);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const handleStopStreaming = () => { stopStreamingRef.current = true; };

  // const handleTabClick = (tabName: string, eventId?: string) => {
  //   setActiveTab(tabName);
  //   if (eventId) {
  //     setSelectedEventId(eventId);
  //   } else {
  //     setSelectedEventId(null);
  //   }
  // };

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
      // Animate via rAF to avoid setTimeout clamping; finish very fast
      const totalDurationMs = wordCount > 100 ? 10000 : 7000;
      await new Promise<void>((resolve) => {
        const start = performance.now();
        const step = (now: number) => {
          if (stopStreamingRef.current) {
            resolve();
            return;
          }
          const elapsed = now - start;
          const progress = Math.min(1, elapsed / totalDurationMs);
          const nextLen = Math.max(i, Math.floor(progress * assistantMessageText.length));
          if (nextLen !== i) {
            i = nextLen;
            const slice = assistantMessageText.slice(0, i);
            setMessages(prev => {
              const copy = [...prev];
              const lastIndex = copy.length - 1;
              if (lastIndex >= 0 && copy[lastIndex].type === 'assistant') {
                copy[lastIndex] = { ...copy[lastIndex], content: slice, isLoading: true };
              }
              return copy;
            });
          }
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });

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

  // Render EventPage when a tab with event is selected
  if (activeTab !== 'chat' && selectedEventId) {
    return (
      <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Navigation Tabs */}
        {/* <div className="max-w-2xl mx-auto w-full px-4 pt-4 mb-4">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => handleTabClick('chat')}
              className={cn(
                "text-sm font-medium pb-0.5 border-b-2 transition-colors",
                activeTab === 'chat' 
                  ? "text-purple-600 border-purple-600" 
                  : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Chat
            </button>
            {embeddedPages.map((page, index) => {
              const label = Object.keys(page)[0];
              const eventId = page[label];
              return (
                <button
                  key={index}
                  onClick={() => handleTabClick(label, eventId)}
                  className={cn(
                    "text-sm font-medium pb-0.5 border-b-2 transition-colors",
                    activeTab === label 
                      ? "text-purple-600 border-purple-600" 
                      : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div> */}

        {/* Banner Image */}
        <div className="max-w-2xl mx-auto">
          <img
            src={bannerUrl || ''}
            alt="Event Banner"
            className="w-full rounded-lg shadow-lg"
            style={{ aspectRatio: '21 / 9', objectFit: 'cover' }}
          />
        </div>

        {/* Event Page Content */}
        <div className="flex-1 overflow-hidden">
          <EventPage eventId={selectedEventId} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Navigation Tabs */}
      {/* <div className="max-w-2xl mx-auto w-full px-4 pt-4 mb-4">
        <div className="flex items-center space-x-6">
          <button
            onClick={() => handleTabClick('chat')}
            className={cn(
              "text-sm font-medium pb-0.5 border-b-2 transition-colors",
              activeTab === 'chat' 
                ? "text-purple-600 border-purple-600" 
                : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
            )}
          >
            Chat
          </button>
          {embeddedPages.map((page, index) => {
            const label = Object.keys(page)[0];
            const eventId = page[label];
            return (
              <button
                key={index}
                onClick={() => handleTabClick(label, eventId)}
                className={cn(
                  "text-sm font-medium pb-0.5 border-b-2 transition-colors",
                  activeTab === label 
                    ? "text-purple-600 border-purple-600" 
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div> */}

      {/* Banner Image */}
      <div className="max-w-2xl mx-auto">
        <img
          src={bannerUrl || ''}
          alt="Event Banner"
          className="w-full rounded-lg shadow-lg"
          style={{ aspectRatio: '21 / 9', objectFit: 'cover' }}
        />
      </div>


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
                    <EnhancedMessageItem message={msg} botImageUrl={botImageUrl} />
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
                 <div ref={endOfMessagesRef} />
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