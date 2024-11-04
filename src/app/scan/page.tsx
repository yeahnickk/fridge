"use client";
import { useState } from 'react';
import CameraCapture from '@/components/CameraCapture';
import { useRouter } from 'next/navigation';

export default function ScanPage() {
  const [showCamera, setShowCamera] = useState(false);
  const router = useRouter();

  const handleCapture = (imageData: string) => {
    // Your image capture logic
  };

  return (
    <div>
      {showCamera ? (
        <CameraCapture 
          onCapture={handleCapture}
          setShowCamera={setShowCamera}
        />
      ) : (
        <div>
          {/* Your regular page content */}
          <button 
            onClick={() => setShowCamera(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-full"
          >
            Scan Fridge
          </button>
        </div>
      )}
    </div>
  );
} 