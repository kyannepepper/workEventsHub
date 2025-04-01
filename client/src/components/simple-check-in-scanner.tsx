import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Registration, Event } from "@shared/schema";
import { 
  QrCode, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Ticket
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CheckInScannerProps {
  event: Event;
  onCheckInComplete: () => void;
}

export default function SimpleCheckInScanner({ event, onCheckInComplete }: CheckInScannerProps) {
  const [manualCode, setManualCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationId, setRegistrationId] = useState("");
  const [manualRegistrations, setManualRegistrations] = useState<Registration[]>([]);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    registration?: Registration;
  } | null>(null);
  const { toast } = useToast();

  // Load registrations for this event
  const loadRegistrations = async () => {
    setIsLoadingRegistrations(true);
    try {
      const response = await fetch(`/api/events/${event.id}/registrations`);
      if (!response.ok) {
        throw new Error("Failed to load registrations");
      }
      const data = await response.json();
      setManualRegistrations(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load registrations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingRegistrations(false);
    }
  };

  // Load registrations when component mounts
  useEffect(() => {
    loadRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Handle manual check-in by QR code
  const handleManualCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualCode) {
      toast({
        title: "Error",
        description: "Please enter a QR code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setScanResult(null);

    try {
      // Check in with the QR code
      const response = await apiRequest("POST", "/api/registrations/check-in", { 
        qrCode: manualCode,
        eventId: event.id
      });
      
      const registration = await response.json();
      
      setScanResult({
        success: true,
        message: "Registration checked in successfully!",
        registration
      });
      
      onCheckInComplete();
      
      // Reset the form
      setManualCode("");
      
      // Refresh the registrations list
      loadRegistrations();
    } catch (error) {
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
      setIsSubmitting(false);
    }
  };

  // Handle check-in by selecting an attendee from the list
  const handleSelectCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!registrationId) {
      toast({
        title: "Error",
        description: "Please select an attendee to check in",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setScanResult(null);

    try {
      // Find the registration by ID
      const selectedRegistration = manualRegistrations.find(r => r.id.toString() === registrationId);
      
      if (!selectedRegistration) {
        throw new Error("Registration not found");
      }

      // Check in the registration
      const response = await apiRequest("POST", "/api/registrations/check-in", { 
        qrCode: selectedRegistration.qrCode,
        eventId: event.id
      });
      
      const registration = await response.json();
      
      setScanResult({
        success: true,
        message: "Registration checked in successfully!",
        registration
      });
      
      onCheckInComplete();
      
      // Reset the form
      setRegistrationId("");
      
      // Refresh the registrations list
      loadRegistrations();
    } catch (error) {
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
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Check-In for {event.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Tabs defaultValue="qrcode" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qrcode">QR Code Check-in</TabsTrigger>
              <TabsTrigger value="attendee">Select Attendee</TabsTrigger>
            </TabsList>
            
            {/* QR Code Check-in Tab */}
            <TabsContent value="qrcode" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Enter a QR code to check in an attendee.
              </p>
              
              <form onSubmit={handleManualCheckIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="qrcode" className="text-sm font-medium">
                    QR Code
                  </label>
                  <Input
                    id="qrcode"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter QR code"
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button type="submit" disabled={isSubmitting || !manualCode}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      Check In
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            {/* Select Attendee Tab */}
            <TabsContent value="attendee" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Select an attendee from the list below to check them in.
              </p>
              
              <form onSubmit={handleSelectCheckIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="registration" className="text-sm font-medium">
                    Select Attendee
                  </label>
                  
                  <Select 
                    value={registrationId} 
                    onValueChange={setRegistrationId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an attendee" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingRegistrations ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </div>
                      ) : manualRegistrations.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No registrations found
                        </div>
                      ) : (
                        manualRegistrations.map(registration => (
                          <SelectItem 
                            key={registration.id} 
                            value={registration.id.toString()}
                            disabled={registration.checkedIn}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{registration.name}</span>
                              {registration.checkedIn && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 ml-2" />
                              )}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" disabled={isSubmitting || !registrationId}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking in...
                    </>
                  ) : (
                    <>
                      <Ticket className="mr-2 h-4 w-4" />
                      Check In Attendee
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          {/* Result display */}
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
          
          {/* Checked-in attendees list */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Checked-in Attendees</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {manualRegistrations.filter(r => r.checkedIn).length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendees checked in yet</p>
              ) : (
                manualRegistrations
                  .filter(r => r.checkedIn)
                  .map(registration => (
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