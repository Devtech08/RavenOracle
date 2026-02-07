
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Camera, RefreshCw, CircleCheck, Loader2, ShieldAlert } from "lucide-react";
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

  const getCameraPermission = useCallback(async () => {
    try {
      setHasCameraPermission(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Trigger rapid autonomous capture sequence immediately
        setCountdown(1.5);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'BIOMETRIC_SENSOR_OFFLINE',
        description: 'Identity verification requires active camera permissions.',
      });
    }
  }, [toast]);

  useEffect(() => {
    getCameraPermission();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [getCameraPermission]);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current && !isCaptured) {
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
  }, [isCaptured, onCapture]);

  useEffect(() => {
    if (countdown === null || isCaptured) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 0.5 : null));
      }, 500);
      return () => clearTimeout(timer);
    } else if (countdown <= 0) {
      handleCapture();
    }
  }, [countdown, isCaptured, handleCapture]);

  const handleReset = () => {
    setIsCaptured(false);
    setCountdown(1.5);
  };

  return (
    <div className="space-y-4 flex flex-col items-center w-full">
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-primary/30 group">
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover ${isCaptured ? 'hidden' : 'block'}`} 
          autoPlay 
          muted 
          playsInline
        />
        <canvas ref={canvasRef} className={`w-full h-full object-cover ${isCaptured ? 'block' : 'hidden'}`} />
        
        {!isCaptured && hasCameraPermission && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-64 border-2 border-primary/50 rounded-[50%] animate-pulse shadow-[0_0_20px_rgba(0,255,255,0.2)]" />
            {countdown !== null && countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
                <div className="text-4xl font-bold text-primary glow-cyan animate-pulse">SCANNING...</div>
              </div>
            )}
          </div>
        )}
        
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
           <span className="text-[10px] bg-black/60 px-3 py-1 text-primary font-mono tracking-widest uppercase border border-primary/20 whitespace-nowrap">
             {isCaptured ? "VISAGE_LOCKED" : countdown !== null ? "ESTABLISHING_LINK..." : label}
           </span>
        </div>
      </div>

      {!hasCameraPermission && hasCameraPermission !== null && (
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-2">
          <Alert variant="destructive" className="bg-destructive/10 border-destructive/50">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-bold tracking-widest uppercase">SENSOR_ACCESS_DENIED</AlertTitle>
            <AlertDescription className="text-[9px] uppercase opacity-70">
              Biometric verification is mandatory for Oracle entry. Please enable camera access.
            </AlertDescription>
          </Alert>
          <Button 
            variant="outline" 
            onClick={getCameraPermission}
            className="w-full text-[10px] font-bold uppercase tracking-[0.2em] border-primary/40 text-primary h-11 hover:bg-primary/10"
          >
            <Camera className="w-3.5 h-3.5 mr-2" />
            ENABLE_BIOMETRIC_SENSOR
          </Button>
        </div>
      )}

      {isCaptured && (
        <div className="flex flex-col items-center space-y-4 w-full animate-in zoom-in-95 duration-500">
          <div className="flex items-center space-x-2 text-green-500">
            <CircleCheck className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">IDENTITY_VERIFIED</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleReset}
            className="text-[9px] text-primary/60 hover:text-primary uppercase h-8"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            RE-CALIBRATE_SCAN
          </Button>
        </div>
      )}

      {!isCaptured && countdown !== null && countdown > 0 && (
        <div className="flex items-center space-x-2 text-primary/60 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="text-[9px] uppercase tracking-widest">Processing biometrics...</span>
        </div>
      )}
    </div>
  );
}
