import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
  const [inputValue, setInputValue] = React.useState<string>(
    field.value ? format(field.value, "dd/MM/yyyy") : ""
  );

  // Actualizar el inputValue cuando cambia el valor del campo
  React.useEffect(() => {
    if (field.value) {
      setInputValue(format(field.value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [field.value]);

  // Manejar cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Intentar parsear la fecha
    if (value) {
      try {
        const parsedDate = parse(value, "dd/MM/yyyy", new Date());
        if (isValid(parsedDate)) {
          field.onChange(parsedDate);
        }
      } catch (error) {
        // No hacer nada si hay un error al parsear
      }
    } else {
      // Si el campo está vacío, establecer el valor a undefined
      field.onChange(undefined);
    }
  };

  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <div className="flex items-center gap-2">
        <FormControl>
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder="DD/MM/YYYY"
            className="flex-1"
          />
        </FormControl>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              type="button"
              className="p-2"
            >
              <CalendarIcon className="w-4 h-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
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
      </div>
      <FormMessage />
    </FormItem>
  );
}