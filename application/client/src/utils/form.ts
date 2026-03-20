export type FormErrors<T extends object> = Partial<Record<keyof T, string>>;

export type FormTouched<T extends object> = Partial<Record<keyof T, boolean>>;

export const hasFormErrors = <T extends object>(errors: FormErrors<T>) =>
  Object.values(errors).some((error) => typeof error === "string" && error.length > 0);
