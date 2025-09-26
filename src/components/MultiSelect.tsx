import { useState } from 'react';
import { Check } from 'lucide-react';

interface MultiSelectProps {
  options: string[];
  onSelect: (selected: string[]) => void;
  isMultiSelect?: boolean;
  disabled?: boolean;
}

const MultiSelect = ({
  options,
  onSelect,
  isMultiSelect = true,
  disabled = false
}: MultiSelectProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  console.log('MultiSelect received options:', options);

  const handleOptionToggle = (option: string) => {
    if (disabled) return;

    let newSelected: string[];

    if (isMultiSelect) {
      // Multi-select: toggle option
      if (selectedOptions.includes(option)) {
        newSelected = selectedOptions.filter(item => item !== option);
      } else {
        newSelected = [...selectedOptions, option];
      }
    } else {
      // Single select: replace selection
      newSelected = [option];
    }

    setSelectedOptions(newSelected);
  };

  const handleSubmit = () => {
    if (disabled) return;
    onSelect(selectedOptions);
  };

  const isSelected = (option: string) => selectedOptions.includes(option);

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
      <div className="space-y-2 mb-4">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionToggle(option)}
            disabled={disabled}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${isSelected(option)
              ? 'bg-purple-100 border-purple-300 text-purple-800'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected(option)
              ? 'bg-purple-600 border-purple-600'
              : 'border-gray-300'
              }`}>
              {isSelected(option) && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="flex-1">{option}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={disabled || (isMultiSelect && selectedOptions.length === 0)}
        className="w-full px-4 py-3 chat-gradient text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isMultiSelect
          ? `Continue with ${selectedOptions.length} selected`
          : selectedOptions.length > 0
            ? `Continue with "${selectedOptions[0]}"`
            : 'Select an option'
        }
      </button>

      {isMultiSelect && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          You can select multiple options
        </p>
      )}
    </div>
  );
};

export default MultiSelect;