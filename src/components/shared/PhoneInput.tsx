"use client";

import { useState } from "react";
import {
  formatBusinessRegistrationNumber,
  formatPhoneNumber,
  normalizeBusinessRegistrationNumber,
  normalizePhoneDigits,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

export function PhoneInput({
  name,
  label,
  required,
  defaultValue = "",
  className,
}: {
  name: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(() =>
    formatPhoneNumber(defaultValue),
  );
  const digits = normalizePhoneDigits(display);

  return (
    <label className={cn("block text-xs", className)}>
      {label}
      {required ? " *" : ""}
      <input type="hidden" name={name} value={digits} />
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={display}
        required={required}
        onChange={(e) => setDisplay(formatPhoneNumber(e.target.value))}
        className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
      />
    </label>
  );
}

export function BusinessNoInput({
  name,
  label,
  defaultValue = "",
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(() =>
    formatBusinessRegistrationNumber(defaultValue),
  );
  const digits = normalizeBusinessRegistrationNumber(display);

  return (
    <label className="block text-xs">
      {label}
      {required ? " *" : ""}
      <input type="hidden" name={name} value={digits} />
      <input
        type="text"
        inputMode="numeric"
        value={display}
        required={required}
        onChange={(e) =>
          setDisplay(formatBusinessRegistrationNumber(e.target.value))
        }
        className="mt-1 w-full rounded-md border border-matchon-border px-3 py-2 text-sm"
      />
    </label>
  );
}
