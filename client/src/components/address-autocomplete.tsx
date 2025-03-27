import { useState, useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

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
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const firstMatchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Google Maps script if not already loaded
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }
  }, []);

  useEffect(() => {
    // Auto-scroll to first match when suggestions update
    if (firstMatchRef.current && listRef.current) {
      firstMatchRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  }, [suggestions, inputValue]);

  const initAutocomplete = () => {
    if (!google?.maps?.places) return;
    autocompleteRef.current = new google.maps.places.AutocompleteService();
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

    // Get Google Places suggestions if search is not empty
    let placeSuggestions: Array<{ id: string; value: string; type: 'address' }> = [];
    if (search && autocompleteRef.current) {
      try {
        const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
          (resolve, reject) => {
            autocompleteRef.current?.getPlacePredictions(
              {
                input: search,
                componentRestrictions: { country: 'us' },
                types: ['address']
              },
              (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                  resolve(results);
                } else {
                  reject(status);
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
    }

    setSuggestions([...matchingParks, ...placeSuggestions]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            value={value}
            placeholder={placeholder}
            className="w-full pr-10"
            onClick={() => setOpen(true)}
            readOnly
          />
          <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search state parks or enter address..."
            value={inputValue}
            onValueChange={handleInputChange}
            className="border-none focus:ring-0"
          />
          <CommandEmpty>No location found.</CommandEmpty>
          <div ref={listRef} className="max-h-[300px] overflow-y-auto">
            {suggestions.length > 0 && (
              <>
                {suggestions.some(s => s.type === 'park') && (
                  <CommandGroup heading="Utah State Parks" className="px-2">
                    {suggestions
                      .filter(s => s.type === 'park')
                      .map((suggestion, index) => (
                        <CommandItem
                          key={suggestion.id}
                          ref={index === 0 ? firstMatchRef : null}
                          onSelect={() => {
                            onChange(suggestion.value);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === suggestion.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {suggestion.value}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
                {suggestions.some(s => s.type === 'address') && (
                  <CommandGroup heading="Addresses" className="px-2">
                    {suggestions
                      .filter(s => s.type === 'address')
                      .map((suggestion) => (
                        <CommandItem
                          key={suggestion.id}
                          onSelect={() => {
                            onChange(suggestion.value);
                            setOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value === suggestion.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {suggestion.value}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                )}
              </>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}