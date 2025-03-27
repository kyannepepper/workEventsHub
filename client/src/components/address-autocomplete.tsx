import { useState, useEffect, useRef } from "react";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Add type definition for Google Maps API
declare global {
  interface Window {
    google?: any;
  }
}

// List of Utah State Parks
const UTAH_STATE_PARKS = [
  "Antelope Island State Park",
  "Bear Lake State Park",
  "Dead Horse Point State Park",
  "Deer Creek State Park",
  "East Canyon State Park",
  "Echo State Park",
  "Escalante Petrified Forest State Park",
  "Fremont Indian State Park",
  "Goblin Valley State Park",
  "Great Salt Lake State Park",
  "Green River State Park",
  "Gunlock State Park",
  "Huntington State Park",
  "Hyrum State Park",
  "Jordan River OHV State Park",
  "Kodachrome Basin State Park",
  "Millsite State Park",
  "Otter Creek State Park",
  "Palisade State Park",
  "Piute State Park",
  "Quail Creek State Park",
  "Red Fleet State Park",
  "Rockport State Park",
  "Sand Hollow State Park",
  "Scofield State Park",
  "Snow Canyon State Park",
  "Starvation State Park",
  "Steinaker State Park",
  "Utah Lake State Park",
  "Wasatch Mountain State Park",
  "Willard Bay State Park",
  "Yuba State Park"
].sort();

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter location..."
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ id: string; value: string; type: 'park' | 'address' }>>([]);
  const autocompleteRef = useRef<any>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstMatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (!window.google) {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
          script.async = true;
          script.onload = initAutocomplete;
          script.onerror = () => {
            console.warn("Failed to load Google Maps API");
          };
          document.head.appendChild(script);
        } else {
          console.warn("Google Maps API key not provided. Addresses will be manually entered.");
        }
      } catch (error) {
        console.warn("Error loading Google Maps API:", error);
      }
    } else {
      initAutocomplete();
    }
  }, []);

  // Removed old scrolling implementation as we have a better one below

  const initAutocomplete = () => {
    try {
      // @ts-ignore - Google Maps API is loaded dynamically
      if (!window.google?.maps?.places) return;
      // @ts-ignore - Google Maps API is loaded dynamically
      autocompleteRef.current = new window.google.maps.places.AutocompleteService();
    } catch (error) {
      console.warn("Failed to initialize Google Maps autocomplete:", error);
    }
  };

  const handleInputChange = async (search: string) => {
    setInputValue(search);

    // Filter state parks based on search term
    const searchLower = search.toLowerCase();
    const matchingParks = UTAH_STATE_PARKS
      .filter(park => park.toLowerCase().includes(searchLower))
      .map(park => ({
        id: park,
        value: park,
        type: 'park' as const
      }));

    // Get Google Places suggestions if search is not empty and Google Maps API is available
    let placeSuggestions: Array<{ id: string; value: string; type: 'address' }> = [];
    if (search && autocompleteRef.current && window.google?.maps?.places) {
      try {
        // @ts-ignore - Google Maps API is loaded dynamically
        const predictions = await new Promise<any[]>(
          (resolve, reject) => {
            autocompleteRef.current?.getPlacePredictions(
              {
                input: search,
                componentRestrictions: { country: 'us' },
                types: ['address']
              },
              (results: any, status: any) => {
                // @ts-ignore - Google Maps API is loaded dynamically
                if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && results) {
                  resolve(results);
                } else {
                  // If API failed, don't treat as error, just return empty results
                  resolve([]);
                }
              }
            );
          }
        );

        placeSuggestions = predictions.map(prediction => ({
          id: prediction.place_id,
          value: prediction.description,
          type: 'address' as const
        }));
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
      }
    } else if (search && search.length >= 5) {
      // Custom fallback: Allow manual address entry if it's at least 5 characters
      placeSuggestions = [{
        id: 'custom-address',
        value: search,
        type: 'address' as const
      }];
    }

    setSuggestions([...matchingParks, ...placeSuggestions]);
  };

  // Find the first match for scroll reference
  useEffect(() => {
    if (inputValue.trim()) {
      // Identify the first matching item (if any)
      const allSuggestions = [...suggestions];
      const firstMatchIndex = allSuggestions.findIndex(s => 
        s.value.toLowerCase().includes(inputValue.toLowerCase())
      );
      
      // If there's a match and a list to scroll
      if (firstMatchIndex >= 0 && listRef.current) {
        // Set timeout to allow rendering to complete
        setTimeout(() => {
          const items = listRef.current?.querySelectorAll('[cmdk-item]');
          if (items && items[firstMatchIndex]) {
            items[firstMatchIndex].scrollIntoView({
              behavior: "smooth",
              block: "nearest"
            });
          }
        }, 50);
      }
    }
  }, [inputValue, suggestions]);

  return (
    <div className="relative w-full">
      <div 
        className={cn(
          "flex items-center rounded-md border border-input bg-background w-full", 
          open && "ring-2 ring-ring ring-offset-background"
        )}
        onClick={() => setOpen(true)}
      >
        <MapPin className="ml-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
        
        {open ? (
          <input
            placeholder="Search state parks or enter address..."
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            autoFocus
          />
        ) : (
          <input
            value={value}
            placeholder={placeholder}
            className="flex h-10 w-full rounded-md bg-transparent px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
            readOnly
            onClick={() => setOpen(true)}
          />
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-popover shadow-md rounded-md border">
          <div className="p-1">
            {!suggestions.length && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No location found
              </div>
            )}
            <div ref={listRef} className="max-h-[300px] overflow-y-auto">
              {suggestions.length > 0 && (
                <>
                  {suggestions.some(s => s.type === 'park') && (
                    <div className="px-2 pt-1 text-xs font-semibold text-muted-foreground">
                      Utah State Parks
                    </div>
                  )}
                  <div className="mt-1">
                    {suggestions
                      .filter(s => s.type === 'park')
                      .map((suggestion, index) => (
                        <div
                          key={suggestion.id}
                          cmdk-item=""
                          role="option"
                          onClick={() => {
                            onChange(suggestion.value);
                            setOpen(false);
                          }}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            "hover:bg-accent hover:text-accent-foreground",
                            value === suggestion.value && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === suggestion.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {suggestion.value}
                        </div>
                      ))}
                  </div>
                  
                  {suggestions.some(s => s.type === 'address') && (
                    <div className="mt-1 px-2 pt-1 text-xs font-semibold text-muted-foreground">
                      Addresses
                    </div>
                  )}
                  <div className="mt-1">
                    {suggestions
                      .filter(s => s.type === 'address')
                      .map((suggestion) => (
                        <div
                          key={suggestion.id}
                          cmdk-item=""
                          role="option"
                          onClick={() => {
                            onChange(suggestion.value);
                            setOpen(false);
                          }}
                          className={cn(
                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                            "hover:bg-accent hover:text-accent-foreground",
                            value === suggestion.value && "bg-accent text-accent-foreground"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === suggestion.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {suggestion.value}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}