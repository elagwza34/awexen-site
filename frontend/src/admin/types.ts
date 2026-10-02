export type AdminRole = "owner" | "admin" | "editor" | "hr" | "support" | "viewer";

export type SectionKey =
  | "overview"
  | "pages"
  | "portfolio"
  | "blog"
  | "messages"
  | "quotes"
  | "newsletter"
  | "clients"
  | "jobs"
  | "applications"
  | "courses"
  | "lms"
  | "enrollments"
  | "approvals"
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
  type?: "text" | "textarea" | "number" | "url" | "image" | "date" | "datetime-local" | "select" | "checkbox";
  storageBucket?: "course-images" | "portfolio-media";
  placeholder?: string;
  required?: boolean;
  nullable?: boolean;
  min?: number;
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
  orderAscending?: boolean;
  defaults: AdminRow;
  fields: FieldDefinition[];
};
