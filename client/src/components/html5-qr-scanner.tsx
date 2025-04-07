import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Registration, Event } from "@shared/schema";
import { 
  Camera,
  X, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  QrCode,
  User,
  Users,
  Copy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";
import { ScanNotification } from "@/components/ui/scan-notification";

interface QrCodeScannerProps {
  event: Event;
  onCheckInComplete: () => void;
}

export default function Html5QrScanner({ event, onCheckInComplete }: QrCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    scannedData?: string;
    registration?: Registration;
    error?: string;
    errorDetail?: any;
  } | null>(null);
  const [checkedInAttendees, setCheckedInAttendees] = useState<Registration[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const { toast } = useToast();

  // Load checked-in attendees when component mounts
  useEffect(() => {
    loadAttendees();
    
    // Cleanup function for when component unmounts
    return () => {
      stopScanner();
    };
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

  // Create a sample QR code registration
  const createSampleRegistration = async (qrCodeValue: string) => {
    try {
      // Submit directly to the check-in endpoint which handles test codes
      const response = await apiRequest("POST", "/api/registrations/check-in", {
        qrCode: qrCodeValue,
        eventId: event.id
      });
      
      const registration = await response.json();
      
      // Update UI with the checked-in registration
      setScanResult({
        success: true,
        message: "Registration checked in successfully!",
        scannedData: qrCodeValue,
        registration
      });
      
      // Refresh attendee list
      loadAttendees();
      
      return registration;
    } catch (error) {
      console.error("Failed to check in sample registration:", error);
      
      let errorMessage = "Failed to check in";
      let errorDetail = null;
      
      // Try to extract detailed error information from the response
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if this is an API error with more details
        if ('cause' in error && error.cause && typeof error.cause === 'object') {
          const cause = error.cause as any;
          
          if (cause.data) {
            try {
              // Try to extract the detailed debug information from the error response
              const errorData = cause.data;
              if (typeof errorData === 'object') {
                errorDetail = errorData;
                
                // If there's a specific error message, use it
                if (errorData.error && typeof errorData.error === 'string') {
                  errorMessage = errorData.error;
                }
              }
            } catch (e) {
              console.error("Error parsing API error details:", e);
            }
          }
        }
      }
      
      // Show error
      setScanResult({
        success: false,
        message: errorMessage,
        scannedData: qrCodeValue,
        error: errorMessage,
        errorDetail: errorDetail
      });
      
      return null;
    }
  };

  // Start the QR code scanner
  const startScanner = async () => {
    console.log("📷 Starting HTML5 QR scanner...");
    
    // Set scanning state immediately
    setIsScanning(true);
    setScanResult(null);
    setIsInitializing(true);
    
    // Reset the attempt counter if this is a fresh start
    if (initializationAttempts > 0) {
      setInitializationAttempts(0);
    }
    
    const startScannerWithDelay = () => {
      // Add a delay before initializing to let the component fully render
      setTimeout(async () => {
        try {
          // Make sure the scanner container element exists
          if (!scannerContainerRef.current) {
            console.error("Scanner container not found");
            throw new Error("Could not initialize QR scanner. Please try again.");
          }
          
          // Clear the container before initializing the scanner
          scannerContainerRef.current.innerHTML = '';
          
          // Create unique scanner ID
          const scannerId = `html5-qrcode-${Date.now()}`;
          const scannerDiv = document.createElement('div');
          scannerDiv.id = scannerId;
          scannerContainerRef.current.appendChild(scannerDiv);
          
          // Create new scanner instance
          scannerRef.current = new Html5Qrcode(scannerId);
                
          const config = {
            fps: 10,
            qrbox: 250,
            aspectRatio: 1.0,
            disableFlip: false,
            formatsToSupport: [0], // Support QR Code format only (0)
          };
          
          // Start scanning
          try {
            await scannerRef.current.start(
              { facingMode: "environment" }, // Use back camera by default
              config,
              handleQrResult,
              (errorMessage) => {
                // This is the QR scanning in progress, so don't display errors here
                console.log(`QR scan in progress, frame error: ${errorMessage}`);
              }
            );
            
            toast({
              title: "Scanner Ready",
              description: "QR code scanner is now active. Point your camera at a QR code.",
            });
            
            setIsInitializing(false);
          } catch (innerError) {
            console.error("Error in scanner initialization:", innerError);
            
            // Increment attempts counter
            const newAttemptCount = initializationAttempts + 1;
            setInitializationAttempts(newAttemptCount);
            
            // If we haven't tried too many times, retry after a delay
            if (newAttemptCount < 3) {
              console.log(`Retrying scanner initialization (attempt ${newAttemptCount + 1})...`);
              
              // Clean up failed scanner attempt
              if (scannerRef.current) {
                try {
                  await scannerRef.current.clear();
                } catch (e) {
                  console.error("Error clearing scanner:", e);
                }
                scannerRef.current = null;
              }
              
              // Wait longer for next retry
              setTimeout(startScannerWithDelay, 1000);
              return;
            }
            
            // If we've tried enough times, show the error
            throw innerError;
          }
        } catch (error) {
          console.error("Error starting scanner:", error);
          setIsScanning(false);
          setIsInitializing(false);
          
          // Check if it's a permission error
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes("Permission") || errorMessage.includes("permission")) {
            toast({
              title: "Camera Permission Denied",
              description: "Please allow camera access to scan QR codes. You may need to update your browser settings.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Scanner Error",
              description: "Could not start the QR code scanner. You can use manual entry instead.",
              variant: "destructive",
            });
            
            // Show manual entry as fallback
            setUseManualInput(true);
          }
        }
      }, 1000); // Longer initial delay (1 second)
    };
    
    // Start the delayed initialization process
    startScannerWithDelay();
  };
  
  // Handle QR code scan result
  const handleQrResult = async (qrCodeData: string) => {
    // Stop scanning - we found a code
    stopScanner();
    
    // Process the QR code data
    setIsSubmitting(true);
    
    try {
      // Display the raw scanned data for debugging
      setScanResult({
        success: true,
        message: "QR Code scanned successfully. Processing...",
        scannedData: qrCodeData
      });
      
      const response = await apiRequest("POST", "/api/registrations/check-in", { 
        qrCode: qrCodeData,
        eventId: event.id
      });
      
      const registration = await response.json();
      
      setScanResult({
        success: true,
        message: "Registration checked in successfully!",
        scannedData: qrCodeData,
        registration
      });
      
      onCheckInComplete();
      
      // Refresh the attendees list
      loadAttendees();
    } catch (error) {
      console.error("Check-in error:", error);
      let errorMessage = "Failed to check in attendee";
      let errorDetail = null;
      
      // Try to extract detailed error information from the response
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check if this is an API error with more details
        if ('cause' in error && error.cause && typeof error.cause === 'object') {
          const cause = error.cause as any;
          
          if (cause.data) {
            try {
              // Try to extract the detailed debug information from the error response
              const errorData = cause.data;
              if (typeof errorData === 'object') {
                errorDetail = errorData;
                
                // If there's a specific error message, use it
                if (errorData.error && typeof errorData.error === 'string') {
                  errorMessage = errorData.error;
                }
              }
            } catch (e) {
              console.error("Error parsing API error details:", e);
            }
          }
        }
      }
      
      setScanResult({
        success: false,
        message: errorMessage,
        scannedData: qrCodeData,
        error: errorMessage,
        errorDetail: errorDetail
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle manual code submission
  const handleManualSubmit = async () => {
    if (!manualCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a QR code value",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Display the raw manual data for debugging
      setScanResult({
        success: true,
        message: "Processing manual QR code...",
        scannedData: manualCode
      });
      
      const registration = await createSampleRegistration(manualCode);
      
      if (registration) {
        setManualCode("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Stop the QR code scanner
  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      console.log("Stopping HTML5 QR scanner...");
      scannerRef.current.stop()
        .then(() => {
          console.log("QR scanner stopped");
          scannerRef.current = null;
          setIsScanning(false);
        })
        .catch(err => {
          console.error("Error stopping QR scanner:", err);
          // Force scanner to be considered stopped even if there was an error
          scannerRef.current = null;
          setIsScanning(false);
        });
    } else {
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setUseManualInput(false);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
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
                <div className="relative border rounded-md overflow-hidden">
                  <div 
                    ref={scannerContainerRef}
                    className="w-full h-[300px]"
                  />
                  
                  {(isSubmitting || isInitializing) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-background p-4 rounded-md flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">
                          {isSubmitting 
                            ? "Processing QR code..." 
                            : "Starting camera, please wait..."}
                        </p>
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
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <Button 
                        onClick={startScanner} 
                        className="w-full sm:w-auto"
                        disabled={isSubmitting || isInitializing}
                      >
                        {isInitializing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Initializing...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Start Scanner
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setUseManualInput(true)}
                        className="w-full sm:w-auto"
                      >
                        Enter Code Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scanResult && (
                      <div className={`p-4 rounded-md ${
                        scanResult.success && scanResult.registration
                          ? "bg-green-50 border border-green-100"
                          : "bg-red-50 border border-red-100"
                      }`}>
                        <div className="flex items-start gap-2">
                          {scanResult.success && scanResult.registration ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-1" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 mt-1" />
                          )}
                          
                          <div className="space-y-2 flex-1">
                            <h3 className="font-medium">
                              {scanResult.success && scanResult.registration
                                ? "Check-in Successful!"
                                : "Check-in Failed"}
                            </h3>
                            <p className="text-sm text-muted-foreground">{scanResult.message}</p>
                            
                            {scanResult.registration && (
                              <div className="mt-3 bg-white p-3 rounded-md shadow-sm">
                                <div className="flex items-center mb-2">
                                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                                    <User className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm mt-1">{scanResult.registration.name || "Not provided"}</p>
                                    <p className="text-xs text-muted-foreground">{scanResult.registration.email || "No email"}</p>
                                    {scanResult.registration.phone && (
                                      <p className="text-xs text-muted-foreground">{scanResult.registration.phone}</p>
                                    )}
                                    {scanResult.registration.participants && scanResult.registration.participants > 1 && (
                                      <div className="mt-1 bg-primary/5 px-2 py-1 rounded-full text-xs">
                                        Group of {scanResult.registration.participants} participants
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <p className="font-semibold">Registration ID:</p>
                                    <p>{scanResult.registration.id}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold">Event ID:</p>
                                    <p>{scanResult.registration.eventId}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold">Check-in Time:</p>
                                    <p>{scanResult.registration.checkedInAt 
                                      ? new Date(scanResult.registration.checkedInAt).toLocaleString()
                                      : "Just now"}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold">Waiver Signed:</p>
                                    <p>{scanResult.registration.waiverSigned 
                                      ? "Yes" 
                                      : event.waiver ? "No" : "Not Required"}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-3 flex flex-col gap-1 text-xs">
                                  <p className="font-semibold">QR Code:</p>
                                  <p className="p-1 bg-black/5 rounded break-all">{scanResult.registration.qrCode}</p>
                                </div>
                              </div>
                            )}
                            
                            {scanResult.error && scanResult.errorDetail && (
                              <div className="mt-3 bg-red-50 p-3 rounded-md text-sm">
                                <p className="font-medium">Debug Information:</p>
                                <pre className="mt-1 p-2 bg-white rounded text-xs overflow-x-auto">
                                  {typeof scanResult.errorDetail === 'object' 
                                    ? JSON.stringify(scanResult.errorDetail, null, 2)
                                    : scanResult.errorDetail}
                                </pre>
                              </div>
                            )}
                            
                            <div className="mt-4 flex gap-2">
                              <Button 
                                onClick={resetScanner} 
                                variant="outline" 
                                size="sm"
                              >
                                Scan Again
                              </Button>
                              {useManualInput && (
                                <Button 
                                  onClick={() => setUseManualInput(false)} 
                                  variant="outline" 
                                  size="sm"
                                >
                                  Cancel Manual Entry
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {useManualInput && (
                      <div className="border rounded-md p-4">
                        <h3 className="text-sm font-medium mb-2">Manual QR Code Entry</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Enter the QR code data manually if the scanner is not working.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Enter QR code data..."
                            disabled={isSubmitting}
                          />
                          <Button 
                            onClick={handleManualSubmit}
                            disabled={!manualCode.trim() || isSubmitting}
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Submit"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

      {/* Popup notification for scan results */}
      {scanResult && (
        <ScanNotification
          type={scanResult.success && scanResult.registration ? 'success' : 'error'}
          message={scanResult.message}
          registration={scanResult.registration}
          errorDetail={scanResult.errorDetail ? 
            typeof scanResult.errorDetail === 'object' 
              ? JSON.stringify(scanResult.errorDetail, null, 2)
              : String(scanResult.errorDetail)
            : undefined
          }
          event={event}
          onClose={() => setScanResult(null)}
        />
      )}
    </>
  );
}