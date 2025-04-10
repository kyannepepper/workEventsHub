import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertEvent, insertEventSchema } from "@shared/schema";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { format } from "date-fns";
import { FileUpload } from "@/components/ui/file-upload";
import { AddressAutocomplete } from "./address-autocomplete";

const CATEGORIES = ["Community", "Education", "Sports", "Culture", "Government", "Other"] as const;

type EventFormProps = {
  defaultValues?: Partial<InsertEvent>;
  onSubmit: (data: any) => void;
  isSubmitting?: boolean;
};

export default function EventForm({
  defaultValues,
  onSubmit,
  isSubmitting,
}: EventFormProps) {
  const [locationType, setLocationType] = useState(
    defaultValues?.location === "Online" ? "online" :
      defaultValues?.location === "TBD" ? "tbd" : "physical"
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [titleForImages, setTitleForImages] = useState(defaultValues?.title || "");

  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      ...defaultValues,
      startTime: defaultValues?.startTime
        ? new Date(defaultValues.startTime)
        : undefined,
      endTime: defaultValues?.endTime
        ? new Date(defaultValues.endTime)
        : undefined,
      images: defaultValues?.images || [],
    },
  });

  const handleSubmit = (data: InsertEvent) => {
    console.log("Form data before submission:", data); // Debug log
    
    // Force correct types for numeric values before submission
    if (typeof data.capacity !== 'undefined') {
      // Ensure capacity is a positive integer
      const capacityValue = parseInt(String(data.capacity), 10);
      data.capacity = !isNaN(capacityValue) && capacityValue > 0 ? capacityValue : 1;
      console.log(`Final capacity value:`, data.capacity);
    }
    
    if (typeof data.price !== 'undefined') {
      // Ensure price is a proper decimal with 2 places
      const priceValue = parseFloat(String(data.price));
      data.price = !isNaN(priceValue) && priceValue >= 0 
        ? Math.round(priceValue * 100) / 100 
        : 0;
      console.log(`Final price value:`, data.price);
    }
    
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'images') {
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (Array.isArray(value)) {
          value.forEach(item => formData.append(key, item));
        } else if (value !== undefined && value !== null) {
          // Convert all values to strings for FormData
          formData.append(key, String(value));
        }
      }
    });

    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
    }

    if (data.images) {
      data.images.forEach(imageUrl => {
        if (!imageUrl.startsWith('blob:')) {
          formData.append('images', imageUrl);
        }
      });
    }

    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="unitNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Number</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. UT-001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="revenueCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Revenue Code</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. REV-2024" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Title</FormLabel>
              <FormControl>
                <Input {...field} onChange={(e) => {
                  field.onChange(e);
                  setTitleForImages(e.target.value);
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Enter event description..."
                  className="min-h-[100px]"
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      field.onChange(new Date(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={field.value instanceof Date ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      field.onChange(new Date(e.target.value));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <FormLabel>Location Type</FormLabel>
          <div className="flex gap-4 mt-2">
            <Button
              type="button"
              variant={locationType === "physical" ? "default" : "outline"}
              onClick={() => {
                setLocationType("physical");
                form.setValue("location", "");
              }}
            >
              Physical
            </Button>
            <Button
              type="button"
              variant={locationType === "online" ? "default" : "outline"}
              onClick={() => {
                setLocationType("online");
                form.setValue("location", "Online");
              }}
            >
              Online
            </Button>
            <Button
              type="button"
              variant={locationType === "tbd" ? "default" : "outline"}
              onClick={() => {
                setLocationType("tbd");
                form.setValue("location", "TBD");
              }}
            >
              TBD
            </Button>
          </div>
        </div>

        {locationType === "physical" && (
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <AddressAutocomplete
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Enter location address..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price (USD) (supports decimals, e.g. 31.99)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '0' : e.target.value;
                      // Parse as float and round to 2 decimal places
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        const roundedValue = Math.round(numValue * 100) / 100;
                        console.log("Setting price to:", roundedValue);
                        field.onChange(roundedValue);
                      } else {
                        console.log("Invalid price, defaulting to 0");
                        field.onChange(0);
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure on blur that we have a valid non-negative number
                      const value = parseFloat(String(field.value));
                      if (isNaN(value) || value < 0) {
                        field.onChange(0);
                      } else {
                        // Round to 2 decimal places
                        field.onChange(Math.round(value * 100) / 100);
                      }
                    }}
                    value={field.value ?? ''}
                    min="0"
                    step="0.01"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity (whole numbers only)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      // Only allow whole numbers for capacity
                      const value = e.target.value === '' ? '1' : e.target.value;
                      // Parse as integer
                      const numValue = parseInt(value, 10);
                      if (!isNaN(numValue) && numValue >= 1) {
                        console.log("Setting capacity to:", numValue);
                        field.onChange(numValue);
                      } else {
                        console.log("Invalid capacity, defaulting to 1");
                        field.onChange(1);
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure on blur that we have a valid positive integer
                      const value = parseInt(String(field.value), 10);
                      if (isNaN(value) || value < 1) {
                        field.onChange(1);
                      }
                    }}
                    value={field.value ?? ''}
                    min="1"
                    step="1"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="needsWaiver"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    id="needs-waiver"
                  />
                  <label
                    htmlFor="needs-waiver"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    This event requires a waiver
                  </label>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="waiver"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Waiver Text (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={4} 
                  value={field.value || ''} 
                  disabled={!form.watch("needsWaiver")} 
                  placeholder={form.watch("needsWaiver") 
                    ? "Enter waiver text here..." 
                    : "Enable 'This event requires a waiver' to add waiver text"
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Images</FormLabel>
              <FormControl>
                <FileUpload
                  onChange={(files) => {
                    if (Array.isArray(files) && files[0] instanceof File) {
                      setImageFiles(files as File[]);
                      field.onChange([...field.value || [], ...files.map(file => URL.createObjectURL(file))]);
                    } else {
                      field.onChange(files);
                    }
                  }}
                  value={field.value || []}
                  searchQuery={titleForImages}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Event"}
        </Button>
      </form>
    </Form>
  );
}