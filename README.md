# Taskmgr

Landing page monolítica “Em breve”, preparada para deploy no Railway.

## Stack

- Next.js 16 + React 19
- Tailwind CSS 4
- shadcn/ui com o preset `bxwdu29UA`
- Railpack + saída standalone do Next.js

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Validação

```bash
pnpm lint
pnpm build
```

## Railway

1. Crie um projeto a partir deste repositório no Railway.
2. O Railpack detectará o Node.js e usará o `railway.json` da raiz.
3. Gere o domínio em **Settings → Networking**.

O serviço usa a variável `PORT` injetada pelo Railway e expõe `GET /health` para o healthcheck. Nenhuma variável de ambiente ou banco de dados é necessária nesta versão.
