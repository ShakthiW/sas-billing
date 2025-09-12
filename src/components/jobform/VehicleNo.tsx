"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatVehicleNumber, validateVehicleNumber } from "@/utils/formatting";
import { useState, useRef } from "react";

interface VehicleNoProps {
  value: string;
  onChange: (value: string) => void;
}

export const VehicleNo: React.FC<VehicleNoProps> = ({ value, onChange }) => {
  const [isValid, setIsValid] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleVehicleInput = (inputValue: string) => {
    // Store cursor position before formatting
    const cursorPosition = inputRef.current?.selectionStart || 0;

    // Format the vehicle number
    const formatted = formatVehicleNumber(inputValue);
    onChange(formatted);

    // Validate the formatted number
    if (formatted.length > 0) {
      setIsValid(validateVehicleNumber(formatted));
    } else {
      setIsValid(true);
    }

    // Restore cursor position after formatting (with some adjustments)
    setTimeout(() => {
      if (inputRef.current) {
        // If a dash was added, adjust cursor position
        const dashAdded = formatted.includes('-') && !inputValue.includes('-');
        const newCursorPosition = dashAdded ? cursorPosition + 1 : cursorPosition;
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="vehicleNo">
        Vehicle Number *
        {!isValid && (
          <span className="text-red-500 text-sm ml-2">
            Invalid format (use format like: 123-4567 or ABC-1234)
          </span>
        )}
      </Label>
      <Input
        ref={inputRef}
        id="vehicleNo"
        type="text"
        value={value}
        onChange={(e) => handleVehicleInput(e.target.value)}
        placeholder="Enter vehicle number (e.g., 123-4567)"
        className={!isValid ? "border-red-500" : ""}
        required
      />
      <div className="text-xs text-muted-foreground">
        Formats: 123-4567 (numeric), ABC-1234 (letters-numbers), 300-ABC (300 series)
      </div>
    </div>
  );
};
