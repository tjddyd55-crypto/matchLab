export type BuiltInFormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "radio"
  | "file"
  | "signature"
  | "consentText";

export type BuiltInFormRequiredRule = boolean | "if_minor";

export type BuiltInFormFieldDefinition = {
  id: string;
  label: string;
  type: BuiltInFormFieldType;
  source: string;
  required?: BuiltInFormRequiredRule;
  editable?: boolean;
  displayOrder?: number;
  placeholder?: string;
  options?: string[];
  consentText?: string;
};

export type BuiltInFormSnapshot = {
  mode: "built_in_form";
  templateId: string;
  templateTitle: string;
  capturedAt: string;
  values: Record<string, string>;
  fieldLabels: Record<string, string>;
  signatures: {
    athlete: "pending" | "completed" | "not_required";
    guardian: "pending" | "completed" | "not_required";
  };
};
