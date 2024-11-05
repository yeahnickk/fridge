import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ title, message, onRetry }) => (
  <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
    <div className="flex items-start gap-4">
      <div className="p-3 bg-red-100 rounded-xl">
        <FiAlertTriangle className="text-xl text-red-600" />
      </div>
      <div>
        <h3 className="font-medium text-red-900 mb-1">{title}</h3>
        <p className="text-red-600 text-sm mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-red-600 hover:text-red-700
                     flex items-center gap-2"
          >
            <FiRefreshCw className="text-lg" />
            Try Again
          </button>
        )}
      </div>
    </div>
  </div>
);

export default ErrorState; 