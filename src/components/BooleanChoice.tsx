import { Check, X } from 'lucide-react';

interface BooleanChoiceProps {
  onResponse: (value: boolean) => void;
  disabled?: boolean;
}

const BooleanChoice = ({ onResponse, disabled = false }: BooleanChoiceProps) => {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => onResponse(true)}
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 font-medium"
        >
          <Check className="w-5 h-5" />
          <span>Yes</span>
        </button>
        
        <button
          onClick={() => onResponse(false)}
          disabled={disabled}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 font-medium"
        >
          <X className="w-5 h-5" />
          <span>No</span>
        </button>
      </div>
    </div>
  );
};

export default BooleanChoice;