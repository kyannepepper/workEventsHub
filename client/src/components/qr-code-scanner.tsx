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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";

interface QrCodeScannerProps {
  event: Event;
  onCheckInComplete: () => void;
}

export default function QrCodeScanner({ event, onCheckInComplete }: QrCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    scannedData?: string;
    registration?: Registration;
  } | null>(null);
  const [checkedInAttendees, setCheckedInAttendees] = useState<Registration[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  // Load checked-in attendees when component mounts
  useEffect(() => {
    loadAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Load attendees for this event
  const loadAttendees = async () => {
    setIsLoadingAttendees(true);
    try {
      const response = await fetch(`/api/events/${event.id}/registrations`);
      if (!response.ok) {
        throw new Error("Failed to load registrations");
      }
      const data = await response.json() as Registration[];
      setCheckedInAttendees(data.filter((r: Registration) => r.checkedIn));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load registrations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  // Start the QR code scanner
  const startScanner = async () => {
    if (!scannerContainerRef.current) return;
    
    try {
      const html5QrCode = new Html5Qrcode("scanner");
      html5QrcodeRef.current = html5QrCode;
      
      setIsScanning(true);
      setScanResult(null);
      
      const qrCodeSuccessCallback = async (decodedText: string) => {
        console.log("🔍 QR Code Scanned:", decodedText);
        
        // Stop scanning when a code is found
        if (html5QrcodeRef.current) {
          await html5QrcodeRef.current.stop();
          setIsScanning(false);
        }
        
        // Submit the code for check-in
        setIsSubmitting(true);
        
        try {
          // Display the raw scanned data for debugging
          setScanResult({
            success: true,
            message: "QR Code scanned successfully. Processing...",
            scannedData: decodedText
          });
          
          const response = await apiRequest("POST", "/api/registrations/check-in", { 
            qrCode: decodedText,
            eventId: event.id
          });
          
          const registration = await response.json();
          
          setScanResult({
            success: true,
            message: "Registration checked in successfully!",
            scannedData: decodedText,
            registration
          });
          
          onCheckInComplete();
          
          // Refresh the attendees list
          loadAttendees();
        } catch (error) {
          let errorMessage = "Failed to check in attendee";
          
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          setScanResult({
            success: false,
            message: errorMessage,
            scannedData: decodedText
          });
          
          toast({
            title: "Check-in Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsSubmitting(false);
        }
      };
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        qrCodeSuccessCallback, 
        (errorMessage) => {
          // This is just for errors during scanning, not for successful scans
          console.log("QR Code scanning error:", errorMessage);
        }
      );
      
      toast({
        title: "Scanner Ready",
        description: "QR code scanner is now active. Point your camera at a QR code.",
      });
    } catch (error) {
      console.error("Error starting scanner:", error);
      setIsScanning(false);
      
      toast({
        title: "Scanner Error",
        description: "Could not start the QR code scanner. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Stop the QR code scanner
  const stopScanner = async () => {
    if (html5QrcodeRef.current && isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        toast({
          title: "Scanner Stopped",
          description: "QR code scanner has been turned off.",
        });
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      setIsScanning(false);
    }
  };
  
  // Clean up scanner when component unmounts
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && isScanning) {
        html5QrcodeRef.current.stop().catch(error => {
          console.error("Error stopping scanner on unmount:", error);
        });
      }
    };
  }, [isScanning]);

  const resetScanner = () => {
    setScanResult(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          QR Code Scanner for {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isScanning ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">QR Code Scanner</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={stopScanner}
                  disabled={isSubmitting}
                >
                  <X className="mr-1 h-4 w-4" />
                  Stop Scanner
                </Button>
              </div>
              
              {/* QR Scanner container */}
              <div 
                ref={scannerContainerRef} 
                className="relative border rounded-md overflow-hidden"
              >
                <div id="scanner" className="w-full h-[300px]"></div>
                
                {isSubmitting && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="bg-background p-4 rounded-md flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm font-medium">Processing QR code...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!scanResult ? (
                <div className="flex flex-col items-center space-y-4 p-4 text-center">
                  <Camera className="h-16 w-16 text-primary" />
                  <p className="text-muted-foreground max-w-md">
                    Click the button below to start scanning QR codes. 
                    Make sure to allow camera access when prompted.
                  </p>
                  <Button 
                    onClick={startScanner} 
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Start QR Scanner
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <Button 
                    onClick={startScanner} 
                    className="w-full sm:w-auto"
                    disabled={isSubmitting}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Scan Another QR Code
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Result display with debug information */}
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
                <div className="w-full">
                  <p className={`font-medium ${
                    scanResult.success ? "text-green-700" : "text-red-700"
                  }`}>
                    {scanResult.success ? "QR code scanned" : "Scan failed"}
                  </p>
                  <p className="text-sm mt-1">
                    {scanResult.message}
                  </p>
                  
                  {/* Debug information */}
                  <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono overflow-x-auto">
                    <p className="font-semibold mb-1">Debug - Scanned Data:</p>
                    <p className="break-all">{scanResult.scannedData}</p>
                  </div>
                  
                  {scanResult.registration && (
                    <div className="mt-3">
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
          
          {/* Checked-in attendees list */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Checked-in Attendees</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {isLoadingAttendees ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : checkedInAttendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees checked in yet</p>
              ) : (
                checkedInAttendees.map(registration => (
                  <div key={registration.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium">{registration.name}</p>
                      <p className="text-xs text-muted-foreground">{registration.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}