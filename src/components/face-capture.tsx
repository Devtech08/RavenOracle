"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Camera, RefreshCw, CircleCheck, Loader2 } from "lucide-react";
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Start autonomous capture sequence
          setCountdown(3);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Enable camera permissions to proceed.',
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

  useEffect(() => {
    if (countdown === null || isCaptured) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleCapture();
    }
  }, [countdown, isCaptured]);

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

  const handleReset = () => {
    setIsCaptured(false);
    setCountdown(3);
  };

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-primary/30 group">
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover ${isCaptured ? 'hidden' : 'block'}`} 
          autoPlay 
          muted 
        />
        <canvas ref={canvasRef} className={`w-full h-full object-cover ${isCaptured ? 'block' : 'hidden'}`} />
        
        {!isCaptured && hasCameraPermission && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-64 border-2 border-primary/50 rounded-[50%] animate-pulse" />
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <span className="text-6xl font-bold text-primary glow-cyan">{countdown}</span>
              </div>
            )}
          </div>
        )}
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
           <span className="text-[10px] bg-black/60 px-2 py-1 text-primary font-mono tracking-widest uppercase">
             {isCaptured ? "IDENT_LOCKED" : countdown !== null ? "AUTO_SCANNING..." : label}
           </span>
        </div>
      </div>

      {!hasCameraPermission && hasCameraPermission !== null && (
        <Alert variant="destructive">
          <AlertTitle>Camera Required</AlertTitle>
          <AlertDescription>
            Identity link requires visual confirmation.
          </AlertDescription>
        </Alert>
      )}

      {isCaptured && (
        <div className="flex flex-col items-center space-y-4 w-full">
          <div className="flex items-center space-x-2 text-green-500 animate-in fade-in">
            <CircleCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Biometric_Established</span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="text-[10px] border-primary/30 text-primary h-8"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            RETAKE_SCAN
          </Button>
        </div>
      )}

      {!isCaptured && countdown !== null && countdown > 0 && (
        <div className="flex items-center space-x-2 text-primary/60 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-[9px] uppercase tracking-widest">Awaiting stability...</span>
        </div>
      )}
    </div>
  );
}