import React from 'react';
import { FiBookmark } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon, action }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] p-6 text-center">
    <div className="w-16 h-16 mb-6 text-blue-500 animate-bounce">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">
      {title}
    </h3>
    <p className="text-gray-500 mb-6 max-w-sm">
      {description}
    </p>
    {action}
  </div>
);

// Usage example:
{!recipes.length && (
  <EmptyState
    icon={<FiBookmark className="w-full h-full" />}
    title="No saved recipes yet"
    description="Your saved recipes will appear here. Start by scanning your fridge!"
    action={
      <button 
        onClick={() => setCurrentView('scan')}
        className="px-4 py-2 bg-blue-600 text-white rounded-full
                 hover:bg-blue-700 transition-colors"
      >
        Scan Now
      </button>
    }
  />
)} 