# KAGE — Dojo de Performance

Sistema monolítico e single-page de hábitos gamificados. Três pilares editáveis, check-in diário, calendário semanal de segunda a domingo, níveis, penalidades, troféus e um objetivo final personalizável.

## Stack

- Next.js 16 + React 19
- Tailwind CSS 4
- shadcn/ui com o preset `bxwdu29UA`
- PostgreSQL + migrations SQL
- Motion + canvas-confetti
- Railpack + saída standalone do Next.js

## Desenvolvimento

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Variáveis locais:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskmgr
TZ=America/Sao_Paulo
```

## Validação

```bash
pnpm lint
pnpm build
```

## Railway

1. Crie um serviço PostgreSQL no mesmo projeto.
2. No serviço da aplicação, adicione `DATABASE_URL=${{Postgres.DATABASE_URL}}`.
3. Adicione `TZ=America/Sao_Paulo`.
4. Conecte o repositório; o `railway.json` executa a migration antes de cada deploy.
5. Gere o domínio em **Settings → Networking**.

O serviço usa a variável `PORT` injetada pelo Railway. `GET /health` só responde como saudável quando o PostgreSQL também está acessível.
