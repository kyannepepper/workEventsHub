import { ChangeEvent, useRef, useState, useEffect } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface FileUploadProps {
  onChange: (files: File[] | string[]) => void;
  value?: string[];
  className?: string;
  multiple?: boolean;
  searchQuery?: string;
}

type SuggestedImage = {
  url: string;
  thumb: string;
  credit: {
    name: string;
    link: string;
  };
};

export function FileUpload({
  onChange,
  value = [],
  className,
  multiple = true,
  searchQuery,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>(value);

  const { data: suggestedImages } = useQuery<SuggestedImage[]>({
    queryKey: ["/api/images/suggestions", searchQuery],
    enabled: !!searchQuery,
    queryFn: async () => {
      if (!searchQuery) return [];
      console.log("Fetching suggestions for:", searchQuery);
      const res = await fetch(`/api/images/suggestions?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to fetch suggestions");
      return res.json();
    },
  });

  useEffect(() => {
    setSelectedImages(value || []);
  }, [value]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    onChange(files);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleSuggestedImageSelect = (imageUrl: string) => {
    const newImages = [...selectedImages, imageUrl];
    setSelectedImages(newImages);
    onChange(newImages);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onChange(newImages);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple={multiple}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Images
        </Button>
      </div>

      {searchQuery && suggestedImages && suggestedImages.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Suggested Images</h3>
          <div className="grid grid-cols-3 gap-4">
            {suggestedImages.map((image, index) => (
              <div
                key={index}
                className="relative aspect-video rounded-lg overflow-hidden group cursor-pointer"
                onClick={() => handleSuggestedImageSelect(image.url)}
              >
                <img
                  src={image.thumb}
                  alt={`Suggestion ${index + 1}`}
                  className="w-full h-full object-cover transition-transform hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-white" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Photo by {image.credit.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {selectedImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden group"
            >
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}