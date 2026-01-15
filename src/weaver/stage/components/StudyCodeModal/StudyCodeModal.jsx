import { X, Copy } from 'lucide-react';
import { useState } from 'react';

export default function StudyCodeModal({ isOpen, onClose, code = "InspiraStudy2025" }) {
  if (!isOpen) return null;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Study confirmation</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Great! You selected exactly <b>10 slides</b>. Use the password below to confirm in Qualtrics:
          </p>
          <div className="flex items-center gap-2">
            <code className="px-3 py-2 bg-gray-100 rounded-lg text-sm">{code}</code>
            <button onClick={copy} className="px-3 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-sm text-gray-500">Keep this window open until you finish the survey step.</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
