import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Registration, Event } from "@shared/schema";
import { 
  Camera, 
  X, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CheckInScannerProps {
  event: Event;
  onCheckInComplete: () => void;
}

export default function CheckInScanner({ event, onCheckInComplete }: CheckInScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    registration?: Registration;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (scanResult) {
      timer = setTimeout(() => {
        setScanResult(null);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [scanResult]);

  const startScanning = async () => {
    setIsInitializing(true);
    setScanResult(null);

    try {
      // First request camera permissions explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream after permission check

      setIsScanning(true); // Set this before initializing QR scanner so the element is rendered
    } catch (err) {
      console.error("Camera init failed:", err);
      let errorMessage = "Failed to initialize camera.";

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = "Camera access was denied. Please grant camera permissions and try again.";
        } else if (err.name === 'NotFoundError') {
          errorMessage = "No camera found. Please ensure your device has a camera.";
        } else if (err.name === 'NotReadableError') {
          errorMessage = "Camera is in use by another application.";
        }
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    let qrScanner: Html5Qrcode | null = null;

    const initializeScanner = async () => {
      if (isScanning && !isInitializing) {
        // Add a small delay to ensure the DOM element is properly rendered
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if the reader element exists before initializing
        const readerElement = document.getElementById("qr-reader");
        if (!readerElement) {
          console.error("Reader element not found");
          setIsScanning(false);
          toast({
            title: "Scanner Error",
            description: "Could not initialize QR scanner. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        try {
          qrScanner = new Html5Qrcode("qr-reader");
          await qrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
              try {
                // The QR code is a JSON string containing registration info
                // We need to handle different formats based on how it was generated
                
                let qrCode = decodedText;
                
                // Check if it's a Base64 image
                if (decodedText.startsWith("data:image")) {
                  // If it's an image, use it directly
                  qrCode = decodedText;
                } else {
                  try {
                    // First try to parse it as JSON
                    const parsedData = JSON.parse(decodedText);
                    // If we successfully parsed the JSON, this is the correct format
                    // We need to send the entire JSON string to the backend
                    console.log("Parsed QR data:", parsedData);
                    qrCode = decodedText;
                  } catch (e) {
                    // If it's not valid JSON, use the text as is
                    console.log("Using raw text as QR code:", decodedText);
                  }
                }
                
                // Check in the registration
                const response = await apiRequest("POST", "/api/registrations/check-in", { 
                  qrCode,
                  eventId: event.id
                });
                
                const registration = await response.json();
                
                // Stop the scanner and show success message
                await qrScanner?.stop();
                setIsScanning(false);
                setScanResult({
                  success: true,
                  message: "Registration checked in successfully!",
                  registration
                });
                
                onCheckInComplete();
              } catch (error) {
                // Don't stop scanning on error, just show the error message
                let errorMessage = "Invalid ticket code";
                
                if (error instanceof Error) {
                  if (error.message.includes("different event")) {
                    errorMessage = "This ticket is for a different event";
                  } else if (error.message) {
                    errorMessage = error.message;
                  }
                }
                
                setScanResult({
                  success: false,
                  message: errorMessage
                });
                
                // Also show toast for better visibility
                toast({
                  title: "Check-in Failed",
                  description: errorMessage,
                  variant: "destructive",
                });
              }
            },
            (errorMessage) => {
              // Only log unexpected errors
              if (!errorMessage.includes("No QR code found")) {
                console.warn("QR error:", errorMessage);
              }
            }
          );
        } catch (err) {
          console.error("Camera init failed:", err);
          setIsScanning(false);
          toast({
            title: "Camera Error",
            description: "Failed to initialize camera. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    initializeScanner();

    // Cleanup function
    return () => {
      if (qrScanner) {
        qrScanner.stop().catch(console.error);
      }
    };
  }, [isScanning, isInitializing, event.id, toast, onCheckInComplete]);

  const stopScanning = async () => {
    setIsScanning(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Check-In Scanner for {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isScanning ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan QR codes to check in attendees for this event.
              </p>
              
              {scanResult && (
                <div className={`p-4 rounded-md ${
                  scanResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                }`}>
                  <div className="flex items-start gap-3">
                    {scanResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        scanResult.success ? "text-green-700" : "text-red-700"
                      }`}>
                        {scanResult.success ? "Check-in successful" : "Check-in failed"}
                      </p>
                      <p className="text-sm mt-1">
                        {scanResult.message}
                      </p>
                      {scanResult.registration && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">{scanResult.registration.name}</p>
                          <p className="text-xs text-muted-foreground">{scanResult.registration.email}</p>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              {new Date(scanResult.registration.createdAt).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <Button onClick={startScanning} disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing Camera...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Scanning
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full max-w-[300px] mx-auto" />
              <Button onClick={stopScanning} variant="outline" size="sm">
                <X className="mr-2 h-4 w-4" />
                Stop Scanning
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}