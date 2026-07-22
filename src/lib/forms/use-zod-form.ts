import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormProps } from "react-hook-form";
import type { z } from "zod";

export function useZodForm<Schema extends z.ZodType>(
  schema: Schema,
  options?: Omit<UseFormProps<z.infer<Schema>>, "resolver">,
) {
  return useForm<z.infer<Schema>>({
    resolver: zodResolver(schema),
    ...options,
  });
}
