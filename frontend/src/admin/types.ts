export type AdminRole = "owner" | "admin" | "editor" | "hr" | "support" | "viewer";

export type SectionKey =
  | "overview"
  | "pages"
  | "blog"
  | "messages"
  | "newsletter"
  | "clients"
  | "jobs"
  | "applications"
  | "courses"
  | "enrollments"
  | "knowledge"
  | "inquiries"
  | "pricing"
  | "users"
  | "settings";

export type AdminRow = Record<string, unknown> & { id?: string | number };

export type FieldOption = { label: string; value: string };

export type FieldDefinition = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "url" | "date" | "datetime-local" | "select" | "checkbox";
  placeholder?: string;
  required?: boolean;
  nullable?: boolean;
  options?: FieldOption[];
  wide?: boolean;
};

export type ResourceDefinition = {
  table: string;
  title: string;
  singular: string;
  description: string;
  titleKey: string;
  subtitleKey?: string;
  statusKey?: string;
  orderBy?: string;
  defaults: AdminRow;
  fields: FieldDefinition[];
};
