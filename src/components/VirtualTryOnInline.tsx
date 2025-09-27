import { useRef, useEffect, useState } from 'react';
import { Loader2, Wand2, Plus, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { tryOnApi, collectionApi, userApi } from '../services/api';
import { useFileUpload } from '../hooks';
import { useTryOnSession } from '../hooks/TryOnSessionContext';
import { db } from '../firebase';

interface TryOnContext {
  store: string;
  serviceId: string;
  prompt: string;
  maxImages: number;
  hint?: string; // optional image URL for hint
}

interface VirtualTryOnInlineProps {
  tryOnContext: TryOnContext;
  onPhotoSelected?: (urls: string[]) => void;
  onSkip?: () => void;
  userId?: string;
}

const VirtualTryOnInline = ({ tryOnContext, onPhotoSelected, onSkip, userId }: VirtualTryOnInlineProps) => {
  const [uploadedItems, setUploadedItems] = useState<{ id: string; url: string | null; uploading: boolean }[]>([]);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [addingToCollection, setAddingToCollection] = useState(false);
  const [collectionCreated, setCollectionCreated] = useState(false);
  const [collectionPath, setCollectionPath] = useState<string | null>(null);
  const [skipping, setSkipping] = useState(false);
  const [nexting, setNexting] = useState(false);
  const [isHintOpen, setIsHintOpen] = useState(false);
  const [additionalInstruction, setAdditionalInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, error } = useFileUpload();
  const { baseImageUrls, setBaseImageUrls } = useTryOnSession();

  // Function to add a new alert to Firestore
  const addAlertToFirestore = async (collectionPath: string, name: string, emailId: string) => {
    try {
      const alertsCollection = collection(db, 'test alert');
      
      const alertData = {
        collection_path: collectionPath,
        name: name,
        emaild_id: emailId,
        timestamp: serverTimestamp() 
      };
      
      const docRef = await addDoc(alertsCollection, alertData);
      console.log('Alert added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding alert:', error);
      throw error;
    }
  };

  const canGenerate = uploadedItems.filter(i => !i.uploading && i.url).length >= 1 && !generating;
  const canAddMore = uploadedItems.length < tryOnContext.maxImages;

  const resolveUserId = async (): Promise<string> => {
    return userId || '';
  };

  const runTryOn = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setResultUrl(null);
    try {
      const baseUrls = uploadedItems.filter(i => i.url).map(i => i.url!)
      // Append additional instruction to prompt if provided
      const finalPrompt = additionalInstruction.trim() 
        ? `${tryOnContext.prompt}\n\nThis is instruction from user: ${additionalInstruction.trim()}`
        : tryOnContext.prompt;
      
      const imageUrl = await tryOnApi.tryOn({
        image_urls: baseUrls,
        store: tryOnContext.store,
        service_id: tryOnContext.serviceId,
        image_tryon_prompt: finalPrompt
      } as any);
      setResultUrl(imageUrl);
    } finally {
      setGenerating(false);
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = `${file.name}-${Date.now()}`;
    setUploadedItems(prev => [...prev, { id, url: null, uploading: true }]);
    const url = await uploadFile(file, tryOnContext?.store);
    if (url) {
      setUploadedItems(prev => prev.map(item => item.id === id ? { ...item, url, uploading: false } : item));
      // Save ONLY the first ever uploaded image URL for session prefill
      if (!baseImageUrls || baseImageUrls.length === 0) {
        setBaseImageUrls([url]);
      }
    } else {
      setUploadedItems(prev => prev.filter(item => item.id !== id));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAt = (id: string) => {
    setUploadedItems(prev => prev.filter(item => item.id !== id));
  };

  // Prefill from session on mount
  useEffect(() => {
    if (baseImageUrls && baseImageUrls.length > 0 && uploadedItems.length === 0) {
      const firstUrl = baseImageUrls[0];
      setUploadedItems([{
        id: `prefill-0-${Date.now()}`,
        url: firstUrl,
        uploading: false
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = async () => {
    if (!onSkip) return;
    try {
      setSkipping(true);
      const start = performance.now();
      await Promise.resolve(onSkip());
      const elapsed = performance.now() - start;
      const minVisibleMs = 600;
      if (elapsed < minVisibleMs) {
        await new Promise(resolve => setTimeout(resolve, minVisibleMs - elapsed));
      }
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

      {error && (
        <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs">{error}</div>
      )}

      {/* Show Hint above upload tiles, below message */}
      {tryOnContext?.hint ? (
        <div>
          <button
            onClick={() => setIsHintOpen(true)}
            className="text-xs py-1 text-purple-600 rounded underline"
          >
            Show hint
          </button>
        </div>
      ) : null}

      {/* Thumbnails + plus tile (no separate Upload button) */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {uploadedItems.map((item, index) => (
            <div key={item.id} className="relative">
              <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                {item.url ? (
                  <img src={item.url} alt={`Uploaded ${index + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
                {item.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => removeAt(item.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                disabled={item.uploading}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Plus tile */}
          {canAddMore && (
            <button
              onClick={openPicker}
              className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
            >
              <Plus className="w-6 h-6 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Additional instruction input */}
      <div className="mt-2">
        <label className="block text-xs text-gray-600 mb-1 ml-1">Additional instruction (optional)</label>
        <input
          type="text"
          value={additionalInstruction}
          onChange={(e) => setAdditionalInstruction(e.target.value)}
          placeholder="Enter additional instructions..."
          className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Try-On button and Skip button in same message area */}
      <div className="mt-1 flex items-center gap-2">
        <button
          onClick={runTryOn}
          disabled={!canGenerate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          <span>Virtual Try On</span>
        </button>
        
        <button
          onClick={handleSkip}
          disabled={skipping}
          aria-busy={skipping}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-300 text-white rounded-lg hover:bg-purple-400 disabled:opacity-50 text-sm"
        >
          {skipping ? <Loader2 className="w-2 h-2 animate-spin" /> : null}
          <span>Skip</span>
        </button>
      </div>

      {/* Result image within the same message box */}
      {resultUrl && (
        <div className="mt-2">
          <img src={resultUrl} alt="try-on result" className="w-full max-w-xs rounded-lg border" />
          <div className="mt-3">
            <button
              onClick={async () => {
                if (!resultUrl) return;
                try {
                  setAddingToCollection(true);
                  // 1) Describe image
                  const desc = await collectionApi.getImageDescription(resultUrl);
                  // 2) Create collection
                  const userId = await resolveUserId();
                  const collectionResponse = await collectionApi.createCollection({
                    first_image: resultUrl,
                    user_id: userId,
                    domain_store: tryOnContext.store,
                    description: desc.description,
                    collection_name: desc.title || 'My Try-On'
                  });

                  console.log('collectionResponse', collectionResponse);
                  
                  // Extract path from response if available
                  if (collectionResponse && typeof collectionResponse === 'object' && 'path' in collectionResponse) {
                    const path = collectionResponse.path as string;
                    const full_path = `https://unthink-ui-gatsby-${tryOnContext.store}-ui-314035436999.us-central1.run.app/${userId}/collections/${path}`
                    setCollectionPath(path);
                    setCollectionCreated(true);
                    
                    // Add alert to Firestore after collection is created
                    try {
                      // Fetch user information first
                      let userName = 'User';
                      let userEmail = 'anonymous';
                      
                      if (userId) {
                        const userInfo = await userApi.getUserInfoById(userId);
                        if (userInfo) {
                          userName = userInfo.first_name || userInfo.user_name || 'User';
                          userEmail = userInfo.emailId || 'anonymous';
                        }
                      }
                      
                      await addAlertToFirestore(full_path, userName, userEmail);
                    } catch (alertError) {
                      console.error('Failed to add alert to Firestore:', alertError);
                      // Don't throw here - collection creation was successful, alert failure shouldn't break the flow
                    }
                  }
                  
                  // 3) Add handpicked products (all uploaded + result). Do not re-upload.
                  const baseUrls = uploadedItems.filter(i => i.url).map(i => i.url!);
                  const product_lists = [...baseUrls].map((url, idx) => ({
                    name: `Item ${idx + 1}`,
                    image: url
                  }));
                  await collectionApi.addHandpickedProducts({
                    collection_id: collectionResponse._id,
                    store: tryOnContext.store,
                    product_lists
                  });
                } finally {
                  setAddingToCollection(false);
                }
              }}
              disabled={addingToCollection}
              className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
            >
              {addingToCollection ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Add to Collection</span>
            </button>
            
            {/* Dynamic link button that appears after collection creation */}
            <div className="mt-4 flex items-center">
              {collectionCreated && collectionPath && (
                <a
                  href={`https://unthink-ui-gatsby-${tryOnContext.store}-ui-314035436999.us-central1.run.app/${userId}/collections/${collectionPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-fit items-center gap-2 px-4 py-2 text-sm text-white hover:text-white border border-purple-200 hover:border-purple-300 rounded-md transition-colors duration-200 hover:bg-purple-50 bg-purple-100 shadow-sm"
                >
                  <span>View collection</span>
                </a>
              )}
              {/* Right-aligned Next button to advance to next question */}
              <button
                onClick={async () => {
                  setNexting(true);
                  try {
                    const start = performance.now();
                    if (onPhotoSelected && resultUrl) {
                      const baseUrls = uploadedItems.filter(i => i.url).map(i => i.url!);
                      const combined = [...baseUrls, resultUrl, ...(collectionPath ? [collectionPath] : [])];
                      await Promise.resolve(onPhotoSelected(combined));
                    } else if (onSkip) {
                      await Promise.resolve(onSkip());
                    }
                    const elapsed = performance.now() - start;
                    const minVisibleMs = 600;
                    if (elapsed < minVisibleMs) {
                      await new Promise(resolve => setTimeout(resolve, minVisibleMs - elapsed));
                    }
                  } finally {
                    setNexting(false);
                  }
                }}
                disabled={nexting}
                aria-busy={nexting}
                className="ml-auto inline-flex items-center gap-2 px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 text-sm"
              >
                {nexting ? <Loader2 className="w-2 h-2 animate-spin" /> : null}
                <span>Next</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hint modal */}
      {isHintOpen && tryOnContext?.hint ? (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setIsHintOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative bg-white rounded-lg shadow-lg p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsHintOpen(false)}
              className="absolute -top-2 -left-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center"
              aria-label="Close hint"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={tryOnContext.hint}
              alt="Hint"
              className="max-w-[18rem] md:max-w-xs max-h-[60vh] object-contain rounded"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default VirtualTryOnInline;


