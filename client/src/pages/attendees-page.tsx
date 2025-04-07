import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Event, Registration } from "@shared/schema";
import { 
  Loader2, Check, X, Search, ChevronDown, ChevronRight, 
  Users, User, UserRound, Baby, UserPlus
} from "lucide-react";
import { DashboardLayout } from "@/components/ui/dashboard-layout";
import React, { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Interface for parsed participants
interface Participant {
  name: string;
  isMinor: boolean;
  waiverSigned?: boolean;
}

export default function AttendeesPage() {
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  // Fetch all events
  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events", user?.id],
    enabled: !!user,
  });

  // Fetch registrations for the selected event
  const { 
    data: registrations, 
    isLoading: registrationsLoading,
    error: registrationsError
  } = useQuery<Registration[]>({
    queryKey: [`/api/events/${selectedEventId}/registrations`],
    enabled: !!selectedEventId,
  });
  
  // Toggle the expanded state of a row
  const toggleExpandRow = (registrationId: number) => {
    setExpandedRows(prev => ({
      ...prev,
      [registrationId]: !prev[registrationId]
    }));
  };
  
  // Parse additional participants from registration
  const parseParticipants = (registration: Registration): Participant[] => {
    if (!registration.additionalParticipants) return [];
    try {
      const participants = JSON.parse(registration.additionalParticipants);
      return Array.isArray(participants) ? participants : [];
    } catch (e) {
      console.error("Error parsing participants:", e);
      return [];
    }
  };
  
  // Count adults and minors in a registration
  const countParticipants = (registration: Registration) => {
    // Start with the main registrant (always an adult)
    let adults = 1;
    let minors = 0;
    
    const participants = parseParticipants(registration);
    
    // Count from additional participants
    participants.forEach(p => {
      if (p.isMinor) {
        minors++;
      } else {
        adults++;
      }
    });
    
    // Fallback to participants count if we don't have detailed info
    if (participants.length === 0 && registration.participants && registration.participants > 1) {
      adults = registration.participants; // Assume all adults if we don't have detailed info
    }
    
    return { adults, minors };
  };

  // Filter registrations based on search query
  const filteredRegistrations = registrations?.filter(registration => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      registration.name.toLowerCase().includes(query) ||
      registration.email.toLowerCase().includes(query)
    );
  });

  if (eventsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Registrations</h1>
            <p className="text-muted-foreground">
              View and manage event registrations
            </p>
          </div>
          
          <div className="w-full md:w-64">
            <Select
              value={selectedEventId || ""}
              onValueChange={(value) => setSelectedEventId(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events?.map((event) => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedEventId ? (
          <Card>
            <CardHeader>
              <CardTitle>Select an Event</CardTitle>
              <CardDescription>
                Choose an event from the dropdown above to view registrations
              </CardDescription>
            </CardHeader>
          </Card>
        ) : registrationsLoading ? (
          <Card>
            <CardContent className="p-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        ) : registrationsError ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-red-500">
                <h3 className="font-bold">Error loading registrations:</h3>
                <p>{(registrationsError as Error).message}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {events?.find(e => e.id === Number(selectedEventId))?.title}
              </CardTitle>
              <CardDescription>
                {registrations?.length || 0} participants registered
              </CardDescription>
              <div className="flex mt-4">
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search registrations..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRegistrations?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {registrations?.length === 0
                    ? "No participants registered for this event yet"
                    : "No registrations match your search"}
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Adults</TableHead>
                        <TableHead>Minors</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Waiver Status</TableHead>
                        <TableHead>Check-in Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRegistrations?.map((registration) => (
                        <React.Fragment key={registration.id}>
                          {/* Main Registrant */}
                          <TableRow className={
                            (registration.additionalParticipants || 
                             (registration.participants && registration.participants > 1)) 
                              ? "cursor-pointer hover:bg-muted/50" 
                              : ""
                          }
                          onClick={() => {
                            if (registration.additionalParticipants || 
                                (registration.participants && registration.participants > 1)) {
                              toggleExpandRow(registration.id);
                            }
                          }}>
                            <TableCell className="font-medium flex items-center gap-2">
                              {/* Icon with dropdown indicator if has additional participants */}
                              {(registration.additionalParticipants || 
                                (registration.participants && registration.participants > 1)) ? (
                                <div className="flex items-center">
                                  {expandedRows[registration.id] ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <Users className="h-4 w-4 text-muted-foreground ml-1" />
                                </div>
                              ) : (
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                              )}
                              {registration.name}
                            </TableCell>
                            
                            {/* Adults column */}
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {countParticipants(registration).adults}
                              </Badge>
                            </TableCell>
                            
                            {/* Minors column */}
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {countParticipants(registration).minors}
                              </Badge>
                            </TableCell>
                            
                            <TableCell>{registration.email}</TableCell>
                            <TableCell>
                              {registration.waiverSigned ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <Check className="h-3 w-3 mr-1" />
                                  Signed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className={
                                  selectedEventId && events?.find(e => e.id === Number(selectedEventId))?.needsWaiver 
                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" 
                                    : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                }>
                                  {selectedEventId && events?.find(e => e.id === Number(selectedEventId))?.needsWaiver ? (
                                    <>
                                      <X className="h-3 w-3 mr-1" />
                                      Not Signed
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-3 w-3 mr-1" />
                                      Not Required
                                    </>
                                  )}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {registration.checkedIn ? (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                  <Check className="h-3 w-3 mr-1" />
                                  Checked In
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  <X className="h-3 w-3 mr-1" />
                                  Not Checked In
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>

                          {/* Display actual additional participants */}
                          {registration.additionalParticipants && expandedRows[registration.id] && (
                            <>
                              {(() => {
                                try {
                                  const additionalParticipants = parseParticipants(registration);
                                  if (additionalParticipants.length > 0) {
                                    return additionalParticipants.map((participant, i) => (
                                      <TableRow key={`participant-${registration.id}-${i}`} className="bg-muted/30">
                                        <TableCell className="pl-8 font-normal text-sm flex items-center gap-2">
                                          {participant.isMinor ? (
                                            <div className="flex items-center gap-2">
                                              <Baby className="h-4 w-4 text-purple-800" />
                                              <span>{participant.name || `Minor participant #${i + 1}`}</span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-2">
                                              <UserPlus className="h-4 w-4 text-blue-800" />
                                              <span>{participant.name || `Additional adult #${i + 1}`}</span>
                                            </div>
                                          )}
                                        </TableCell>
                                        
                                        {/* Adults column - empty for additional adults, 0 for minors */}
                                        <TableCell>
                                          {!participant.isMinor && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                              1
                                            </Badge>
                                          )}
                                          {participant.isMinor && (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                              0
                                            </Badge>
                                          )}
                                        </TableCell>
                                        
                                        {/* Minors column - empty for adults, 1 for minors */}
                                        <TableCell>
                                          {participant.isMinor && (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                              1
                                            </Badge>
                                          )}
                                          {!participant.isMinor && (
                                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                              0
                                            </Badge>
                                          )}
                                        </TableCell>
                                        
                                        <TableCell>
                                          <span className="text-xs text-muted-foreground italic">
                                            {participant.isMinor ? 'Under guardian' : 'Part of group'}
                                          </span>
                                        </TableCell>
                                        
                                        <TableCell>
                                          {participant.waiverSigned ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 text-xs">
                                              <Check className="h-3 w-3 mr-1" />
                                              Signed
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className={
                                              selectedEventId && events?.find(e => e.id === Number(selectedEventId))?.needsWaiver 
                                                ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 text-xs" 
                                                : "bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs"
                                            }>
                                              {selectedEventId && events?.find(e => e.id === Number(selectedEventId))?.needsWaiver ? (
                                                <>Waiver missing</>
                                              ) : (
                                                <>Not required</>
                                              )}
                                            </Badge>
                                          )}
                                        </TableCell>
                                        
                                        <TableCell>
                                          {registration.checkedIn ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 text-xs">
                                              Checked in with group
                                            </Badge>
                                          ) : (
                                            <Badge variant="outline" className="text-muted-foreground text-xs">
                                              Not checked in
                                            </Badge>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ));
                                  }
                                  return null;
                                } catch (e) {
                                  console.error("Error parsing additional participants:", e);
                                  return null;
                                }
                              })()}
                            </>
                          )}

                          {/* Display fallback for participants count without detailed info */}
                          {(!registration.additionalParticipants && 
                            registration.participants && 
                            registration.participants > 1 && 
                            expandedRows[registration.id]) && (
                            <>
                              {Array.from({ length: (registration.participants || 1) - 1 }).map((_, i) => (
                                <TableRow key={`participant-fallback-${registration.id}-${i}`} className="bg-muted/30">
                                  <TableCell className="pl-8 font-normal text-sm flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                      <UserPlus className="h-4 w-4 text-blue-800" />
                                      <span>Additional participant #{i + 1}</span>
                                    </div>
                                  </TableCell>
                                  
                                  {/* Adults column - default to 1 for fallback */}
                                  <TableCell>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                      1
                                    </Badge>
                                  </TableCell>
                                  
                                  {/* Minors column - default to 0 for fallback */}
                                  <TableCell>
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                      0
                                    </Badge>
                                  </TableCell>
                                  
                                  <TableCell>
                                    <span className="text-xs text-muted-foreground italic">Part of group</span>
                                  </TableCell>
                                  
                                  <TableCell>
                                    {registration.waiverSigned ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 text-xs">
                                        <Check className="h-3 w-3 mr-1" />
                                        Included in group waiver
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className={
                                        selectedEventId && events?.find(e => e.id === Number(selectedEventId))?.needsWaiver 
                                          ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 text-xs" 
                                          : "bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs"
                                      }>
                                        {selectedEventId && events?.find(e => e.id === Number(selectedEventId))?.needsWaiver ? (
                                          <>Group waiver missing</>
                                        ) : (
                                          <>Not required</>
                                        )}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  
                                  <TableCell>
                                    {registration.checkedIn ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50 text-xs">
                                        Checked in with group
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-muted-foreground text-xs">
                                        Not checked in
                                      </Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}