import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  X, 
  AlertCircle,
  Mail, 
  Phone,
  Users
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Registration } from '@shared/schema';

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
  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 w-80 p-4 rounded-lg shadow-lg text-white transition-all duration-500 animate-in slide-in-from-bottom-5 ${
        type === 'success' ? 'bg-gradient-to-br from-green-500 to-green-700' : 'bg-gradient-to-br from-red-500 to-red-700'
      }`}
    >
      <div className="absolute top-2 right-2">
        <button 
          onClick={onClose}
          className="text-white/80 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {type === 'success' ? (
            <CheckCircle2 className="h-6 w-6 text-white" />
          ) : (
            <AlertCircle className="h-6 w-6 text-white" />
          )}
        </div>
        
        <div className="flex-1">
          <p className="font-semibold text-sm mb-2">
            {type === 'success' ? 'Check-in Successful!' : 'Check-in Failed'}
          </p>
          <p className="text-sm mb-3 text-white/90">{message}</p>
          
          {type === 'success' && registration && (
            <div className="bg-white/10 rounded-md p-3 text-sm">
              <div className="flex items-center mb-2 pb-2 border-b border-white/20">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mr-2">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">{registration.name}</p>
                  <p className="text-xs text-white/80">{registration.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <div className="flex items-center">
                  <Users className="h-3 w-3 mr-1 text-white/70" />
                  <span>
                    {registration.participants && registration.participants > 1 
                      ? `Group of ${registration.participants}` 
                      : 'Individual'}
                  </span>
                </div>
                
                <div className="flex items-center">
                  {registration.waiverSigned ? (
                    <span className="flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-white/70" />
                      Waiver Signed
                    </span>
                  ) : (
                    <span className="flex items-center">
                      {event?.needsWaiver ? (
                        <>
                          <XCircle className="h-3 w-3 mr-1 text-white/70" />
                          Waiver Missing
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3 w-3 mr-1 text-white/70" />
                          Waiver Not Required
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {type === 'error' && errorDetail && (
            <div className="bg-white/10 rounded-md p-2 text-xs mt-2">
              <p className="font-medium mb-1">Error Details:</p>
              <p className="whitespace-pre-wrap break-all">{errorDetail}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};