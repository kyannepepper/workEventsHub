import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertEvent, insertEventSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'images') {
        if (value instanceof Date) {
          formData.append(key, value.toISOString());
        } else if (Array.isArray(value)) {
          value.forEach(item => formData.append(key, item));
        } else if (value !== undefined && value !== null) {
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
                <FormLabel>Price (USD)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '0' : e.target.value;
                      field.onChange(Number(value));
                    }}
                    value={field.value ?? ''}
                    min="0"
                    step="1"
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
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === '' ? '1' : e.target.value;
                      field.onChange(Number(value));
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
          name="waiver"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Waiver Text (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={4} value={field.value || ''} />
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