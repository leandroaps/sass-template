/**
 * CRUD de exemplo demonstrando o padrão reutilizável em src/lib/crud.ts:
 * validação com Zod → query tipada com Drizzle, escopada por organização →
 * resposta JSON padronizada ({ data, ... }). Novos recursos devem copiar o
 * par _crud.ts + route.ts(s) deste diretório.
 */
import { todosCrud } from "./_crud";

export const { GET, POST } = todosCrud.collection;
