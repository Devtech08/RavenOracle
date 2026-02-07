
"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Camera, RefreshCw, CircleCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FaceCaptureProps {
  onCapture: (imageData: string) => void;
  label?: string;
}

export function FaceCapture({ onCapture, label = "BIOMETRIC_SCAN" }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Enable camera permissions to proceed with identity verification.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const imageData = canvasRef.current.toDataURL('image/jpeg');
        setIsCaptured(true);
        onCapture(imageData);
      }
    }
  };

  return (
    <div className="space-y-4 flex flex-col items-center">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-primary/30 group">
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover ${isCaptured ? 'hidden' : 'block'}`} 
          autoPlay 
          muted 
        />
        <canvas ref={canvasRef} className={`w-full h-full object-cover ${isCaptured ? 'block' : 'hidden'}`} />
        
        {!isCaptured && hasCameraPermission && (
          <div className="absolute inset-0 border-2 border-primary/20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-primary/50 rounded-[50%] animate-pulse" />
          </div>
        )}
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
           <span className="text-[10px] bg-black/60 px-2 py-1 text-primary font-mono tracking-widest">{label}</span>
        </div>
      </div>

      {!hasCameraPermission && hasCameraPermission !== null && (
        <Alert variant="destructive">
          <AlertTitle>Camera Access Required</AlertTitle>
          <AlertDescription>
            Identity verification requires visual confirmation. Please allow access.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-2">
        {!isCaptured ? (
          <Button 
            onClick={handleCapture} 
            disabled={!hasCameraPermission}
            className="bg-primary text-primary-foreground text-xs font-bold"
          >
            <Camera className="w-4 h-4 mr-2" />
            CAPTURE_IDENTITY
          </Button>
        ) : (
          <Button 
            variant="outline" 
            onClick={() => setIsCaptured(false)}
            className="text-xs border-primary/30 text-primary"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            RETAKE_SCAN
          </Button>
        )}
      </div>
      
      {isCaptured && (
        <div className="flex items-center space-x-2 text-green-500 animate-in fade-in">
          <CircleCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Biometric_Locked</span>
        </div>
      )}
    </div>
  );
}
