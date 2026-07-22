# SaaS Template

[![CI](https://github.com/SEU_USUARIO/SEU_REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/SEU_USUARIO/SEU_REPO/actions/workflows/ci.yml)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Node](https://img.shields.io/badge/Node-%E2%89%A522-339933)

> Troque `SEU_USUARIO/SEU_REPO` acima pelo caminho real do seu repositório assim que publicar — o badge de CI só funciona depois disso.

Template base, pronto para produção, para aplicações SaaS: **Next.js fullstack**, **TypeScript**, **PostgreSQL (Drizzle ORM)**, autenticação, i18n, **Playwright**, **Docker** e **GitHub Actions** já configurados e conversando entre si.

A ideia é clonar, rodar um punhado de comandos e já ter: banco com migrations versionadas, autenticação por e-mail/senha funcionando, multi-tenancy desde o schema, formulários validados de ponta a ponta, testes E2E e CI/CD — para você focar na regra de negócio do seu SaaS, não em configurar infraestrutura de novo.

## Para quem é este template

- **Já programa e quer só a stack pronta** → vá direto para [Começando rapidamente](#começando-rapidamente).
- **Está começando agora ou nunca rodou um projeto Next.js/Docker antes** → siga o [Guia passo a passo](#guia-passo-a-passo-iniciantes), que explica cada comando antes de rodá-lo.

## Stack

| Camada                       | Tecnologia                  | Por quê                                                                                          |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------ |
| Framework                    | Next.js 15 (App Router)     | Front + API no mesmo deploy, RSC, `output: standalone` para Docker enxuto                        |
| Estilização                  | Tailwind CSS v4             | Utility-first, config via CSS (`@theme` em `globals.css`), zero `tailwind.config.js`             |
| i18n                         | next-intl                   | Rotas por locale (`/pt-BR`, `/en`), middleware resolve o idioma, strings em `src/i18n/messages/` |
| Estado de servidor (cliente) | TanStack Query              | Cache/refetch/mutations para listas interativas; provider em `src/components/query-provider.tsx` |
| Feedback                     | sonner                      | Toasts de sucesso/erro; wrapper em `src/lib/toast.ts`                                            |
| Formulários                  | react-hook-form + Zod       | Mesmo schema do backend via `zodResolver`; wrapper em `src/lib/forms/`                           |
| Auth                         | Better Auth                 | E-mail/senha, sessão via cookie, organização provisionada no primeiro acesso; `src/lib/auth.ts`  |
| Linguagem                    | TypeScript `strict`         | `noUncheckedIndexedAccess` ligado — segurança máxima de tipos                                    |
| Banco                        | PostgreSQL 17 + Drizzle ORM | Queries 100% tipadas, migrations versionadas em SQL, zero codegen em runtime                     |
| Validação                    | Zod                         | Valida env no boot e payloads nas rotas                                                          |
| Testes                       | Playwright                  | E2E de UI **e** de API no mesmo runner                                                           |
| Infra                        | Docker multi-stage          | Imagem final ~150MB, roda como usuário não-root                                                  |
| CI/CD                        | GitHub Actions              | Lint → Typecheck → E2E com Postgres real → Build/push da imagem no GHCR                          |

## Pré-requisitos

| Ferramenta                                            | Versão                  | Necessária para                                                                         |
| ----------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| [Docker](https://www.docker.com/) + Docker Compose v2 | qualquer versão recente | Sempre — é como o Postgres roda (e opcionalmente o app inteiro)                         |
| [Node.js](https://nodejs.org/)                        | 22 ou superior          | Rodar `npm run dev` localmente (não é necessário se você só quer subir tudo via Docker) |
| [Git](https://git-scm.com/)                           | qualquer versão recente | Clonar o repositório                                                                    |

Não sabe se tem essas ferramentas instaladas? Rode `docker --version`, `node --version` e `git --version` no terminal — se algum comando não for reconhecido, instale-o primeiro.

## Começando rapidamente

```bash
# 1. Dependências
npm install

# 2. Ambiente
cp .env.example .env
# abra o .env e gere um BETTER_AUTH_SECRET (veja a seção "Variáveis de ambiente" abaixo)

# 3. Banco (via Docker)
docker compose up -d db

# 4. Migrations
npm run db:generate   # gera SQL a partir do schema (não cria nada se já estiver tudo aplicado)
npm run db:migrate    # aplica no banco

# 5. Dev server
npm run dev
```

App em `http://localhost:3000` (redireciona para `/pt-BR`, o locale padrão) · Healthcheck em `/api/health`.

**Rodando vários projetos baseados neste template ao mesmo tempo?** Cada um precisa de porta e banco próprios. Edite o `.env`:

```
DB_PORT=5433                  # porta livre na sua máquina
DB_NAME=meu_projeto_dev
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/meu_projeto_dev
```

O compose lê `DB_PORT`/`DB_NAME` automaticamente. O volume de dados é prefixado pelo nome da pasta do projeto, então cada clone tem seu banco isolado sem conflito.

## Guia passo a passo (iniciantes)

Se você nunca rodou um projeto assim antes, siga esta versão mais explicada. Ela assume que você já tem Docker instalado (veja [Pré-requisitos](#pré-requisitos)) e não exige experiência prévia com Next.js ou Postgres.

### 1. Baixe o projeto

Se você chegou aqui pelo botão **"Use this template"** do GitHub, você já criou seu próprio repositório — clone-o normalmente:

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPO.git
cd SEU_REPO
```

### 2. Configure as variáveis de ambiente

O arquivo `.env` guarda configurações sensíveis (senhas, chaves) que não vão para o Git. Copie o modelo:

```bash
cp .env.example .env
```

Abra o `.env` num editor de texto e gere um valor para `BETTER_AUTH_SECRET` (obrigatório — sem ele o app nem sobe). Se tiver o `openssl` instalado (padrão em Mac/Linux):

```bash
openssl rand -base64 32
```

Cole o resultado como valor de `BETTER_AUTH_SECRET` no `.env`. Não tem `openssl`? Qualquer string aleatória com 32+ caracteres funciona — só não reutilize a mesma em produção.

### 3. Suba o banco de dados

O Postgres roda dentro de um container Docker, então você não precisa instalar nada além do Docker:

```bash
docker compose up -d db
```

Isso baixa a imagem do Postgres (na primeira vez) e deixa o banco rodando em segundo plano. Para conferir que subiu:

```bash
docker compose ps
```

Você deve ver o serviço `db` com status `Up`/`healthy`.

### 4. Crie as tabelas do banco

O projeto usa **migrations**: arquivos SQL versionados que descrevem a estrutura do banco. Gere e aplique:

```bash
npm install            # se ainda não rodou
npm run db:generate    # lê src/db/schema.ts e gera o SQL correspondente
npm run db:migrate     # executa esse SQL no banco
```

Você deve ver `✅ Migrations aplicadas` no final. Se algo falhar aqui, veja a seção [Solução de problemas](#solução-de-problemas).

### 5. Rode o app

```bash
npm run dev
```

Abra `http://localhost:3000` no navegador. A página deve mostrar o status do banco como "conectado" — isso confirma que tudo está funcionando.

### 6. Explore

- Crie uma conta em `/sign-up` e veja o login funcionando de ponta a ponta.
- Depois de logado, `/account` mostra uma página protegida (só acessível com sessão).
- A lista de tarefas na home é um exemplo completo de formulário + API + banco — use como referência para seus próprios recursos.

### Alternativa: tudo via Docker, sem instalar Node

Se você não quer instalar Node.js na sua máquina, é possível rodar o app inteiro (banco + servidor) só com Docker:

```bash
cp .env.example .env   # gere o BETTER_AUTH_SECRET como no passo 2 acima
docker compose up --build
```

Isso builda a imagem do app, sobe o Postgres, aplica as migrations automaticamente e inicia o servidor — tudo dentro de containers. Acesse `http://localhost:3000` normalmente. Use esse caminho se você só quer _usar_ o app; para editar o código com hot reload, prefira `npm run dev` (passo 5 acima).

## Variáveis de ambiente

Definidas em `.env.example` (copie para `.env` e ajuste):

| Variável             | Para que serve                                                                                                                                           | Obrigatória         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `DB_PORT`            | Porta do Postgres publicada na sua máquina (mude se já usa 5432 para outro projeto)                                                                      | Sim                 |
| `DB_NAME`            | Nome do banco deste projeto                                                                                                                              | Sim                 |
| `APP_PORT`           | Porta do app ao rodar via `docker compose up app`                                                                                                        | Sim (para o Docker) |
| `DATABASE_URL`       | String de conexão usada por `npm run dev` e pelas migrations locais — precisa bater com `DB_PORT`/`DB_NAME` acima (o `.env` não interpola variáveis)     | Sim                 |
| `BASE_URL`           | URL pública do app; o Better Auth rejeita requisições cuja origem não bate com este valor ("Invalid origin") — se mudar `APP_PORT`, atualize aqui também | Sim                 |
| `BETTER_AUTH_SECRET` | Assina sessões/cookies. Gere com `openssl rand -base64 32` (mínimo 32 caracteres)                                                                        | Sim                 |

`src/lib/env.ts` valida essas variáveis com Zod assim que o app sobe — se faltar alguma, o erro aparece imediatamente no boot, não depois em produção.

## Scripts

| Comando                      | Descrição                                                          |
| ---------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                | Dev server com hot reload                                          |
| `npm run build` / `start`    | Build e serve de produção                                          |
| `npm run lint` / `typecheck` | Qualidade de código                                                |
| `npm run ci:verify`          | Roda lint + typecheck (o mesmo que o job `quality` do CI)          |
| `npm run db:generate`        | Gera migration SQL a partir do schema Drizzle (`src/db/schema.ts`) |
| `npm run db:migrate`         | Aplica migrations pendentes no banco                               |
| `npm run db:studio`          | UI visual do banco (Drizzle Studio)                                |
| `npm run test:e2e`           | Playwright (sobe o app sozinho via `webServer`)                    |
| `npm run test:e2e:ui`        | Playwright em modo interativo                                      |

Rodando um teste específico: `npx playwright test e2e/api.spec.ts` ou `npx playwright test -g "nome do teste"`.

## Docker

```bash
# Stack completa (app + postgres)
docker compose up --build
```

O entrypoint aplica migrations automaticamente no boot (desative com `SKIP_MIGRATIONS=true` se preferir rodar como release job separado, útil com múltiplas réplicas).

## CI (GitHub Actions)

Pipeline em `.github/workflows/ci.yml`:

1. **quality** — lint + typecheck (falha rápido)
2. **e2e** — Postgres real como service container → migrations → build de produção → Playwright (report vira artifact)
3. **docker** — build multi-stage com cache do GHA e push para `ghcr.io` (apenas em push na `main`)

## Estrutura

```
src/
  app/
    [locale]/     # Páginas (layout.tsx é o root layout; strings via next-intl)
      sign-up/, sign-in/, account/  # páginas de auth (account/ é protegida)
    api/health/   # Healthcheck (Docker, LB, Playwright) — fora do [locale], sem i18n
    api/todos/    # CRUD de exemplo via src/lib/crud.ts (Zod + Drizzle) — idem, público
    api/auth/[...all]/  # handler do Better Auth (sign-up/in/out, sessão) — idem
    api/account/  # rota protegida de exemplo (401 sem sessão) — idem
    globals.css   # Tailwind (@import "tailwindcss" + tokens em @theme)
  i18n/
    routing.ts    # Locales suportados + locale padrão
    navigation.ts # Link/usePathname/useRouter com consciência de locale
    request.ts    # Carrega o catálogo de mensagens por request
    messages/     # pt-BR.json, en.json
  db/
    schema.ts     # Fonte única de verdade do banco
    index.ts      # Client singleton com pool
  lib/env.ts      # Validação de env com Zod (fail-fast)
  lib/toast.ts    # showSuccess/showError, único ponto que importa sonner
  lib/schemas/    # Zod schemas compartilhados entre rota e formulário (ex.: todos.ts)
  lib/forms/      # useZodForm (react-hook-form + zodResolver), mapZodErrorsToForm
  lib/crud.ts     # createCrudHandlers — factory de rotas CRUD (list/get/create/update/delete)
  lib/organization.ts # getDefaultOrgId (placeholder de org — /api/todos continua público de propósito, ver CLAUDE.md)
  lib/auth.ts     # Better Auth (Drizzle adapter), getSession/requireSessionOrRedirect
  lib/auth-client.ts # cliente React do Better Auth (signIn/signUp/signOut/useSession)
  components/     # Componentes de cliente (locale-switcher.tsx, query-provider.tsx, health-check-button.tsx, todo-form.tsx, auth-nav.tsx, sign-out-button.tsx)
middleware.ts     # Resolve o locale (cookie → Accept-Language → pt-BR)
e2e/              # Testes Playwright (UI + API)
drizzle/          # Migrations SQL versionadas
scripts/          # migrate.ts (local, CI e container)
```

## Autenticação e multi-tenancy

- Auth por e-mail/senha via **Better Auth**, com sessão em cookie. Páginas de exemplo: `/sign-up`, `/sign-in`, `/account` (protegida).
- Toda conta pertence a uma **organização** (`organizations`), o "tenant" raiz do schema. A organização é criada automaticamente no primeiro acesso à `/account` — não existe passo manual de setup.
- Tabelas de domínio (veja `todos` como exemplo) sempre têm `organization_id` obrigatório. Ao criar um recurso novo que deve ser restrito à sessão do usuário, siga o padrão de `src/app/api/account/route.ts` (chama `getSession`/`requireSessionOrRedirect` diretamente), **não** `src/lib/crud.ts` — esse factory serve para recursos públicos como `/api/todos` (veja o comentário em `src/lib/organization.ts` e o `CLAUDE.md` para o racional completo).

## Solução de problemas

**`relation "user" does not exist` (ou qualquer outra tabela) ao usar o app**
O schema (`src/db/schema.ts`) tem tabelas que ainda não têm migration correspondente em `drizzle/`. Gere e aplique:

```bash
npm run db:generate && npm run db:migrate
```

**`password authentication failed for user "<seu-usuário-do-sistema>"` ao rodar `npm run db:migrate`**
Isso acontece quando `DATABASE_URL` não está definida no shell — `next dev` carrega o `.env` automaticamente, mas o script de migration (`tsx scripts/migrate.ts`) não. Exporte o `.env` antes de rodar o comando:

```bash
set -a && source .env && set +a && npm run db:migrate
```

**`Invalid origin: ...` do Better Auth**
`BASE_URL` no `.env` não bate com a porta em que você está acessando o app. Se você mudou `APP_PORT` (Docker) ou a porta do `npm run dev`, atualize `BASE_URL` para a mesma porta.

**Container do `db` sobe mas o `app` fica `unhealthy`**
Veja os logs: `docker compose logs app`. Na maioria das vezes é uma variável de ambiente faltando/incorreta (confira a seção [Variáveis de ambiente](#variáveis-de-ambiente)) ou migrations pendentes (veja o primeiro item acima).

**Conflito de porta rodando vários projetos deste template**
Cada projeto precisa de `DB_PORT`/`DB_NAME`/`APP_PORT` próprios no `.env` — veja [Começando rapidamente](#começando-rapidamente).

## Próximos passos sugeridos

- **Billing**: Stripe com webhooks em `/api/webhooks/stripe`
- **Observabilidade**: Sentry + OpenTelemetry
- Veja a seção de escalabilidade na documentação do projeto

## Licença

Este template não inclui uma licença por padrão. Antes de publicar o repositório, adicione um arquivo `LICENSE` com a licença de sua escolha (por exemplo, [MIT](https://choosealicense.com/licenses/mit/) para permitir uso livre, incluindo comercial) — sem isso, os direitos ficam reservados por padrão e outras pessoas não têm permissão legal para usar o template.
