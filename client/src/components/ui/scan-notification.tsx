import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  X, 
  AlertCircle,
  Mail, 
  Phone,
  Users,
  Baby, // Use Baby icon instead of Child (which doesn't exist)
  Calendar,
  CheckCheck
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Registration } from '@shared/schema';
import { Button } from './button';

interface ScanNotificationProps {
  type: 'success' | 'error';
  message: string;
  registration?: Registration;
  event?: {
    waiver: string | null;
    needsWaiver?: boolean;
    title: string;
  };
  errorDetail?: string;
  onClose: () => void;
}

export const ScanNotification = ({ 
  type, 
  message, 
  registration, 
  errorDetail,
  event,
  onClose 
}: ScanNotificationProps) => {
  // Define participant type for TypeScript
  interface Participant {
    name: string;
    isMinor: boolean;
    waiverSigned?: boolean;
  }

  // Parse the additional participants if they exist
  const additionalParticipants = React.useMemo<Participant[]>(() => {
    if (registration?.additionalParticipants) {
      try {
        return JSON.parse(registration.additionalParticipants);
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [registration?.additionalParticipants]);

  const hasAdditionalParticipants = additionalParticipants.length > 0;
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm`}
    >
      <div 
        className={`relative w-full max-w-md mx-4 p-6 rounded-lg shadow-lg text-white transition-all duration-500 max-h-[90vh] overflow-y-auto ${
          type === 'success' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-red-500 to-red-700'
        }`}
      >  
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-1">
            {type === 'success' ? (
              <CheckCircle2 className="h-6 w-6 text-white" />
            ) : (
              <AlertCircle className="h-6 w-6 text-white" />
            )}
          </div>
          
          <div className="flex-1">
            <p className="font-semibold text-base mb-2">
              {type === 'success' ? 'Check-in Successful!' : 'Check-in Failed'}
            </p>
            <p className="text-sm mb-3 text-white/90">{message}</p>
          </div>
        </div>
        
        {type === 'success' && registration && (
          <div className="space-y-4">
            <div className="bg-white/10 rounded-md p-4 text-sm">
              <div className="flex items-center mb-3 pb-2 border-b border-white/20">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-base">{registration.name}</p>
                  <p className="text-xs text-white/80">{registration.email}</p>
                  {registration.phone && (
                    <p className="text-xs text-white/80 flex items-center mt-1">
                      <Phone className="h-3 w-3 mr-1" /> {registration.phone}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="flex items-center text-sm">
                  <Users className="h-4 w-4 mr-2 text-white/70" />
                  <span>
                    {registration.participants && registration.participants > 1 
                      ? `Group of ${registration.participants}` 
                      : 'Individual'}
                  </span>
                </div>
                
                <div className="flex items-center text-sm">
                  {registration.waiverSigned ? (
                    <span className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 mr-2 text-white/70" />
                      Waiver Signed
                    </span>
                  ) : (
                    <span className="flex items-center">
                      {event?.needsWaiver ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2 text-white/70" />
                          Waiver Missing
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-white/70" />
                          Waiver Not Required
                        </>
                      )}
                    </span>
                  )}
                </div>

                {registration.checkedInAt && (
                  <div className="flex items-center text-sm col-span-2">
                    <Calendar className="h-4 w-4 mr-2 text-white/70" />
                    <span>
                      Checked in at {new Date(registration.checkedInAt).toLocaleTimeString()} 
                    </span>
                  </div>
                )}
              </div>
            </div>

            {hasAdditionalParticipants && (
              <div className="bg-white/10 rounded-md p-4 text-sm">
                <h3 className="font-medium text-base mb-3 pb-2 border-b border-white/20">
                  Additional Participants ({additionalParticipants.length})
                </h3>
                <div className="space-y-3">
                  {additionalParticipants.map((participant: Participant, index: number) => (
                    <div key={index} className="pl-3 border-l-2 border-white/30">
                      <div className="flex items-center gap-2">
                        {participant.isMinor ? (
                          <Baby className="h-4 w-4 text-white/70" />
                        ) : (
                          <User className="h-4 w-4 text-white/70" />
                        )}
                        <span className="font-medium">{participant.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto border-white/30 text-white/80">
                          {participant.isMinor ? 'Minor' : 'Adult'}
                        </Badge>
                      </div>
                      {participant.waiverSigned && (
                        <div className="flex items-center mt-1 text-xs text-white/80">
                          <CheckCheck className="h-3 w-3 mr-1 text-white/70" />
                          Waiver signed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="py-2 text-sm text-center text-white/80">
              Event: <span className="font-medium">{event?.title}</span>
            </div>
          </div>
        )}
        
        {type === 'error' && errorDetail && (
          <div className="bg-white/10 rounded-md p-4 text-sm mt-2">
            <p className="font-medium mb-2">Error Details:</p>
            <p className="whitespace-pre-wrap break-all">{errorDetail}</p>
          </div>
        )}
        
        <div className="mt-6 flex justify-center">
          <Button
            onClick={onClose}
            className="w-full bg-white hover:bg-white/90 text-gray-900 font-medium"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};