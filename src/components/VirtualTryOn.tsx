import { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Wand2, Loader2 } from 'lucide-react';
import { useFileUpload } from '../hooks';
import { tryOnApi } from '../services/api';

interface VirtualTryOnProps {
  store: string;
  serviceId: string;
  prompt: string;
}

const VirtualTryOn = ({ store, serviceId, prompt }: VirtualTryOnProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, error } = useFileUpload();
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'product' | 'user'>('product');

  const handleSelect = async (file: File) => {
    const uploaded = await uploadFile(file, store);
    if (!uploaded) return;
    if (step === 'product') {
      setProductImageUrl(uploaded);
      setStep('user');
    } else {
      setUserImageUrl(uploaded);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openPicker = () => fileInputRef.current?.click();

  const runTryOn = async () => {
    if (!productImageUrl || !userImageUrl) return;
    setGenerating(true);
    setResultUrl(null);
    try {
      const imageUrl = await tryOnApi.tryOn({
        image_urls: [productImageUrl, userImageUrl],
        store,
        service_id: serviceId,
        image_tryon_prompt: prompt
      } as any);
      setResultUrl(imageUrl);
    } catch (e) {
      // handled by API layer console
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = !!productImageUrl && !!userImageUrl && !generating;

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

      {error && (
        <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700 text-xs">{error}</div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={openPicker}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          {step === 'product' ? <ImageIcon className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          <span>{step === 'product' ? 'Add Product Photo' : 'Add Your Photo'}</span>
        </button>

        <button
          onClick={runTryOn}
          disabled={!canGenerate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          <span>Virtual Try On</span>
        </button>
      </div>

      <div className="flex gap-2">
        {productImageUrl && (
          <img src={productImageUrl} className="w-16 h-16 rounded-lg object-cover border" alt="product" />
        )}
        {userImageUrl && (
          <img src={userImageUrl} className="w-16 h-16 rounded-lg object-cover border" alt="user" />
        )}
      </div>

      {resultUrl && (
        <div className="mt-2">
          <img src={resultUrl} alt="try-on result" className="w-full max-w-xs rounded-lg border" />
        </div>
      )}
    </div>
  );
};

export default VirtualTryOn;


