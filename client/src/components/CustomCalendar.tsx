import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CustomCalendarProps {
  field: {
    value: Date | undefined;
    onChange: (date: Date | undefined) => void;
  };
  label: string;
  placeholder?: string;
}

export function CustomCalendar({ field, label, placeholder = "Seleccionar fecha" }: CustomCalendarProps) {
  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={"outline"}
              className={cn(
                "w-full pl-3 text-left font-normal",
                !field.value && "text-muted-foreground"
              )}
            >
              {field.value ? (
                format(field.value, "PPP", { locale: es })
              ) : (
                <span>{placeholder}</span>
              )}
              <CalendarIcon className="w-4 h-4 ml-auto opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={field.onChange}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
            initialFocus
            captionLayout="dropdown-buttons"
            fromYear={1920}
            toYear={2025}
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
}