import {
  authLoginFieldStackClass,
  authLoginInputClass,
  authLoginLabelClass,
} from "@/lib/ui/auth-login-ui";
import { cn } from "@/lib/utils";

export type AuthLoginFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: "text" | "password";
  autoComplete?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export function AuthLoginField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  defaultValue,
  placeholder,
  disabled,
  required = true,
  className,
}: AuthLoginFieldProps) {
  return (
    <div className={cn(authLoginFieldStackClass, className)}>
      <label htmlFor={id} className={authLoginLabelClass}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={authLoginInputClass}
      />
    </div>
  );
}
