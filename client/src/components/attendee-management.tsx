import { useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Attendee } from "@shared/schema";
import { 
  Check, 
  UserCheck, 
  DollarSign, 
  Users, 
  Camera, 
  X, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface AttendeeManagementProps {
  eventId: number;
  price: number | null;
}

export default function AttendeeManagement({ eventId, price = 0 }: AttendeeManagementProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [attendeesPerPage] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
    fetchAttendees();
    setCurrentPage(1); // Reset to first page when event changes
  }, [eventId]);

  const fetchAttendees = async () => {
    try {
      const response = await apiRequest("GET", `/api/events/${eventId}/attendees`);
      const data = await response.json();
      setAttendees(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch attendees",
        variant: "destructive",
      });
    }
  };

  const startScanning = async () => {
    setIsInitializing(true);

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
        const readerElement = document.getElementById("reader");
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
          qrScanner = new Html5Qrcode("reader");
          await qrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            async (decodedText) => {
              try {
                // The QR code could be either:
                // 1. A ticket code (string)
                // 2. A Base64-encoded QR code image
                // 3. Some JSON data that contains a ticket code
                
                let ticketCode = decodedText;
                let qrCodeData = null;
                
                // Check if it's a Base64 image
                if (decodedText.startsWith("data:image")) {
                  qrCodeData = decodedText;
                  // We'll send the QR image data to the server for verification
                } else {
                  // Try to parse it as JSON in case it's a JSON object
                  try {
                    const parsedData = JSON.parse(decodedText);
                    // Extract ticket code from parsed data if available
                    if (parsedData.ticketCode) {
                      ticketCode = parsedData.ticketCode;
                    }
                  } catch (e) {
                    // Not JSON, use as raw ticket code
                  }
                }
                
                const response = await apiRequest("POST", "/api/attendees/check-in", { 
                  ticketCode,
                  qrCodeData,
                  eventId: eventId
                });
                toast({
                  title: "Success",
                  description: "Attendee checked in successfully",
                });
                await qrScanner?.stop();
                setIsScanning(false);
                fetchAttendees();
                setCurrentPage(1); // Reset to first page to show checked in attendee
              } catch (error) {
                let errorMessage = "Invalid ticket code";
                if (error instanceof Error && error.message.includes("different event")) {
                  errorMessage = "This ticket is for a different event";
                }
                toast({
                  title: "Error",
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
  }, [isScanning, isInitializing, eventId, toast]);

  const stopScanning = async () => {
    setIsScanning(false);
  };

  // Pagination calculation
  const indexOfLastAttendee = currentPage * attendeesPerPage;
  const indexOfFirstAttendee = indexOfLastAttendee - attendeesPerPage;
  const currentAttendees = attendees.slice(indexOfFirstAttendee, indexOfLastAttendee);
  const totalPages = Math.ceil(attendees.length / attendeesPerPage);
  
  // Stats calculation
  const totalRevenue = (price || 0) * attendees.length;
  const checkedInCount = attendees.filter(a => a.checkedIn).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkedInCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!isScanning ? (
              <Button onClick={startScanning} disabled={isInitializing}>
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing Camera...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Scan QR Code
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-4">
                <div id="reader" className="w-full max-w-[300px] mx-auto" />
                <Button onClick={stopScanning} variant="outline" size="sm">
                  <X className="mr-2 h-4 w-4" />
                  Stop Scanning
                </Button>
              </div>
            )}
            <div className="divide-y">
              {currentAttendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {attendee.qrCodeData && (
                      <div className="h-16 w-16 flex-shrink-0">
                        <img 
                          src={attendee.qrCodeData} 
                          alt={`QR code for ${attendee.name}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{attendee.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {attendee.email}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Ticket: {attendee.ticketCode.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                  {attendee.checkedIn ? (
                    <div className="flex items-center text-green-600">
                      <Check className="h-4 w-4 mr-1" />
                      <span>
                        Checked In
                        {attendee.checkedInAt && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(attendee.checkedInAt).toLocaleString()}
                          </div>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Not Checked In
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous Page</span>
                  </Button>
                  
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next Page</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}