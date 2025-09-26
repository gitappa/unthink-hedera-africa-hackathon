 

interface PaymentOption {
  label: string;
  key: string;
  type: string;
  value: number;
  currency: string;
  is_enable: boolean;
  payment_link: string;
}

interface PaymentDetailsProps {
  message: string;
  value: Record<string, PaymentOption>;
  action: string[];
  onProceed: (paymentLink: string) => void;
  currentQuestionKey?: string;
  nextQuestionKey?: string;
}

const PaymentDetails = ({ message, value, action, onProceed, currentQuestionKey, nextQuestionKey }: PaymentDetailsProps) => {
  // Debug logging
  console.log('=== PAYMENT DETAILS COMPONENT DEBUG ===');
  console.log('Message:', message);
  console.log('Value:', value);
  console.log('Action:', action);
  console.log('Options keys:', Object.keys(value || {}));
  console.log('Current question key:', currentQuestionKey);
  console.log('Next question key:', nextQuestionKey);
  console.log('=====================================');

  const handleProceedClick = () => {
    const optionKeys = Object.keys(value || {});
    const selectedKey = optionKeys.find((key) => value[key]?.is_enable) ?? optionKeys[0] ?? '';
    console.log('Proceed clicked, selected option:', selectedKey);
    if (selectedKey && value[selectedKey]) {
      const paymentLink = value[selectedKey].payment_link;
      console.log('Payment link:', paymentLink);
      onProceed(paymentLink);
    }
  };

  const options = Object.keys(value || {});

  return (
    <div className="space-y-4">
      {/* Message */}
      <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
      {/* Proceed Button */}
      <div className="pt-2">
        <button
          onClick={handleProceedClick}
          disabled={options.length === 0}
          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {action[0] || 'Proceed to Buy'}
        </button>
      </div>
    </div>
  );
};

export default PaymentDetails;
