import { useRef, useEffect } from "react";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  setShowCamera: (show: boolean) => void;
  onCancel: () => void;
}

const CameraCapture = ({ onCapture, setShowCamera }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleCancel = () => {
    // Stop all video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    // Just hide the camera
    setShowCamera(false);
  };

  useEffect(() => {
    // Initialize camera
    if (videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          setShowCamera(false);
        });
    }

    // Cleanup function
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/jpeg');
        // Stop the camera stream
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        onCapture(imageData);
        setShowCamera(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-10 inset-x-0">
        <div className="container mx-auto px-6">
          <div className="relative flex items-center justify-center">
            <button
              onClick={() => setShowCamera(false)}
              className="absolute left-0 text-white text-lg font-medium 
                         px-8 py-3 rounded-full bg-white/20 backdrop-blur-md
                         active:bg-white/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={captureImage}
              className="w-20 h-20 rounded-full border-4 border-white
                         flex items-center justify-center
                         active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-white"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;