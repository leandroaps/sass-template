import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

type FlattenedZodError = {
  fieldErrors: Record<string, string[] | undefined>;
};

export function mapZodErrorsToForm<T extends FieldValues>(
  details: FlattenedZodError,
  setError: UseFormSetError<T>,
) {
  for (const [field, messages] of Object.entries(details.fieldErrors)) {
    const message = messages?.[0];
    if (!message) continue;
    setError(field as Path<T>, { type: "server", message });
  }
}
