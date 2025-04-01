import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Registration, Event } from "@shared/schema";
import { 
  Camera, 
  X, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Ticket
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";

interface CheckInScannerProps {
  event: Event;
  onCheckInComplete: () => void;
}

export default function CheckInScanner({ event, onCheckInComplete }: CheckInScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    registration?: Registration;
  } | null>(null);
  
  const { toast } = useToast();
  
  // Start the QR scanner
  const startScanner = async () => {
    setIsLoading(true);
    setScanResult(null);
    
    try {
      // Clean up any existing scanner
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }
      
      // Make sure we have a container to mount the scanner
      if (!scannerContainerRef.current) {
        throw new Error("Scanner container not found");
      }
      
      // Create a scanner ID if it doesn't exist
      if (!scannerContainerRef.current.id) {
        scannerContainerRef.current.id = "qr-scanner-container";
      }
      
      const scannerId = scannerContainerRef.current.id;
      
      // Create a new scanner instance
      scannerRef.current = new Html5Qrcode(scannerId);
      
      // Turn on scanning
      setIsScanning(true);
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          try {
            console.log("QR Code detected:", decodedText);
            
            // Process the QR code
            await processQrCode(decodedText);
            
            // Stop scanning after successful reading
            if (scannerRef.current) {
              await scannerRef.current.stop();
              setIsScanning(false);
            }
          } catch (error) {
            console.error("QR code processing error:", error);
          }
        },
        (errorMessage) => {
          // Ignore "No QR found" messages as they're expected
          if (!errorMessage.includes("No QR code found")) {
            console.warn("QR scan error:", errorMessage);
          }
        }
      );
    } catch (error) {
      console.error("Scanner initialization error:", error);
      
      let errorMessage = "Failed to initialize camera.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Scanner Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      setIsScanning(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Stop the scanner
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
  };
  
  // Clean up the scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);
  
  // Process a scanned QR code
  const processQrCode = async (qrCodeData: string) => {
    setIsLoading(true);
    
    try {
      // Attempt to check in the registration
      console.log("Checking in with QR code:", qrCodeData);
      
      const response = await apiRequest("POST", "/api/registrations/check-in", {
        qrCode: qrCodeData,
        eventId: event.id
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to check in attendee");
      }
      
      const registration = await response.json();
      
      // Show success message
      setScanResult({
        success: true,
        message: "Registration checked in successfully!",
        registration
      });
      
      // Notify parent component
      onCheckInComplete();
      
    } catch (error) {
      console.error("Check-in error:", error);
      
      let errorMessage = "Failed to check in attendee";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setScanResult({
        success: false,
        message: errorMessage
      });
      
      toast({
        title: "Check-in Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear result after a delay
  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => {
        setScanResult(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Scanner for {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground mb-2">
            Scan QR codes to check in attendees for this event.
          </p>
          
          {/* Scanner button */}
          {!isScanning ? (
            <Button 
              onClick={startScanner} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initializing Camera...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Start QR Scanner
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={stopScanner} 
              variant="outline"
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Stop Scanner
            </Button>
          )}
          
          {/* Scanner container */}
          {isScanning && (
            <div className="mt-4 rounded-md overflow-hidden border">
              <div 
                ref={scannerContainerRef} 
                id="qr-scanner-container"
                style={{ 
                  width: '100%', 
                  maxWidth: '400px',
                  height: '300px',
                  margin: '0 auto',
                  position: 'relative'
                }}
              />
            </div>
          )}
          
          {/* Scan result */}
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
                          {new Date(scanResult.registration.checkedInAt!).toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Instructions */}
          {isScanning && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Point your camera at a QR code to scan</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}