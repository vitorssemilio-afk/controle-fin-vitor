# Controle Financeiro

Aplicativo web de controle financeiro pessoal: contas, cartões de crédito com
fatura, transações recorrentes, orçamentos por categoria, metas de poupança
e relatórios.

Stack: **Next.js (App Router) + TypeScript**, **PostgreSQL** via **Prisma**,
autenticação com **NextAuth** (credenciais, e-mail e senha).

## Status

**Fase 1 — Fundação e autenticação** ✅

- Scaffold Next.js + TypeScript + Tailwind
- Prisma + PostgreSQL configurados (Docker Compose)
- Autenticação por e-mail/senha (NextAuth, sessão via JWT)
- Modelo inicial: `User` e `FinancialAccount` (conta corrente, poupança,
  carteira, investimento), com moeda por conta
- Toda leitura/escrita de conta passa por funções que recebem o id do
  usuário autenticado e filtram por ele (`src/lib/accounts.ts`) — nunca por
  um id vindo do cliente
- Onboarding para cadastrar a primeira conta
- Testes automatizados cobrindo isolamento de dados entre usuários e
  hashing de senha

**Fase 2 — Transações e categorias** ✅

- CRUD de transações (receita, despesa e transferência entre contas
  próprias), com data, valor, conta, categoria e descrição
- Categorias padrão criadas para cada usuário no cadastro (`Moradia`,
  `Mercado`, `Transporte`, `Saúde`, `Lazer`, `Educação`, `Assinaturas`,
  `Salário`, `Freelance`, `Investimentos`, `Outros`), editáveis e com
  criação de novas
- Transferências não têm categoria e não entram como receita/despesa —
  apenas movem saldo entre duas contas do mesmo usuário
- Saldo de cada conta no dashboard agora é calculado de verdade
  (`initialBalance` + transações), nunca armazenado
- Filtro de transações por conta, categoria e período
- Testes automatizados: cálculo de saldo com receita/despesa/transferência,
  validação de categoria compatível com o tipo da transação, e isolamento
  de transações e categorias entre usuários

**Fase 3 — Cartão de crédito e faturas** ✅

- Cadastro de cartão com dia de fechamento e dia de vencimento
- Lançamento de compra no cartão: cai automaticamente na fatura certa a
  partir da data de fechamento (compra até o dia de fechamento cai na
  fatura deste mês, depois disso cai na do mês seguinte)
- Parcelamento: divide o valor em centavos entre as faturas seguintes sem
  perder nem inventar centavo (sobra vai para as primeiras parcelas)
- Fechamento manual de fatura e pagamento, debitando a conta escolhida
- Compra no cartão não afeta o saldo da conta na hora — só quando a fatura
  é paga, para o parcelamento fazer sentido e o saldo não cair antes da
  hora. O pagamento gera uma transação de um tipo novo (`CARD_PAYMENT`)
  que debita a conta mas não entra como despesa por categoria, para não
  contar o mesmo gasto duas vezes nos relatórios
- Testes automatizados: cálculo de qual fatura uma compra cai (incluindo
  virada de mês/ano e meses mais curtos), divisão exata do parcelamento,
  fechamento/pagamento de fatura, e isolamento de cartões e faturas entre
  usuários

**Fase 4 — Recorrências e orçamentos** ✅

- Transações recorrentes (assinaturas, salário, aluguel) com frequência
  semanal, mensal ou anual e data final opcional
- Não existe cron nesta stack: cada regra guarda até quando já gerou
  lançamentos, e toda vez que o dashboard, as transações ou os orçamentos
  são abertos, o app gera de uma vez todos os ciclos que faltam até hoje —
  inclusive vários meses acumulados se o usuário ficou um tempo sem entrar
- Orçamento mensal por categoria de despesa, com barra de progresso e
  alerta de "orçamento estourado"; o gasto soma tanto as despesas em
  dinheiro/débito quanto as compras no cartão de crédito daquele mês (o
  cartão já conta como gasto no momento da compra, não só quando a fatura é
  paga — ver Fase 3)
- Testes automatizados: geração de ocorrências (incluindo acúmulo de vários
  ciclos, respeito à data final, sem duplicar ao rodar de novo), cálculo de
  gasto por categoria somando conta e cartão, alerta de estouro, e
  isolamento de recorrências e orçamentos entre usuários

**Fase 5 — Metas de poupança** ✅

- Criação de metas com valor alvo e prazo, com vínculo opcional a uma conta
  do tipo poupança
- Progresso da meta é sempre o saldo real da conta vinculada (a mesma conta
  de saldo calculado desde a Fase 1) — um saque reduz o progresso, não só
  os depósitos aumentam
- Projeção de quando a meta será atingida no ritmo médio desde que a meta
  foi criada; quando não há dado suficiente para uma projeção honesta (sem
  conta vinculada, menos de 30 dias de histórico, ou saldo não está
  crescendo) o app mostra isso explicitamente em vez de uma data inventada
- Testes automatizados: cada caso da projeção (sem conta, meta atingida,
  histórico insuficiente, ritmo negativo, projeção calculada), progresso
  refletindo saques e depósitos reais, e isolamento de metas entre usuários

**Fase 6 — Relatórios** ✅

- Visão mensal de receitas versus despesas (as mesmas regras das fases
  anteriores: despesa soma conta + cartão, nunca conta transferência nem
  pagamento de fatura)
- Gastos por categoria comparados com o mês anterior, num gráfico
  "antes → depois" por categoria (só aparecem categorias com movimento em
  pelo menos um dos dois meses)
- Evolução do patrimônio somando todas as contas, últimos 12 meses, com
  gráfico de linha interativo (passar o mouse mostra o valor exato de cada
  mês)
- Exportação em CSV das transações do mês visualizado (conta + compras no
  cartão), pelo botão "Exportar CSV"
- Testes automatizados: resumo mensal excluindo transferência/pagamento de
  fatura, comparação por categoria (incluindo categoria sem movimento em
  nenhum dos dois meses), um caso de borda de fronteira de mês no cálculo
  de patrimônio (lançamento no dia 1 não pode vazar para o saldo de fim do
  mês anterior), e isolamento de relatórios entre usuários

Todas as fases do escopo original estão implementadas.

## Rodando localmente

### Pré-requisitos

- Node.js 20+
- Docker (para o Postgres) — ou um Postgres local já rodando

### 1. Instalar dependências

```bash
npm install
```

### 2. Subir o banco de dados

```bash
docker compose up -d
```

Isso sobe um Postgres 16 em `localhost:5432` com usuário/senha `postgres` e
banco `controle_fin` (ver `docker-compose.yml`).

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Gere um valor para `NEXTAUTH_SECRET` com:

```bash
openssl rand -base64 32
```

### 4. Rodar as migrations

```bash
npm run db:migrate
```

### 5. Iniciar o app

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000). Você será
redirecionado para `/register` → `/onboarding` (cadastro da primeira conta)
→ `/dashboard`.

## Testes

Os testes de lógica de negócio (isolamento entre usuários, hashing de senha)
rodam contra um banco de teste dedicado (`controle_fin_test`), separado do
banco de desenvolvimento — nunca contra dados reais.

```bash
npm test
```

O comando aplica as migrations no banco de teste e roda a suíte com Vitest.
Requer que o Postgres do `docker compose up -d` esteja no ar (o script cria
o banco `controle_fin_test` a partir da mesma instância, se ele não existir
crie manualmente com `createdb controle_fin_test` ou via `psql`).

## Direção visual

Definida na Fase 1 e aplicada de forma consistente daqui em diante:

- **Tipografia**: `Fraunces` (serifada) para títulos, `Manrope` para texto
  e interface, `IBM Plex Mono` com números tabulares para valores
  monetários — facilita comparar quantias de cabeça para baixo, como em um
  extrato.
- **Paleta**: fundo "papel" quente (`#F7F5F0`), verde-escuro como cor
  primária (`#1F4D3A`), terracota para negativos/alertas (`#A3402B`). Sem
  cinza-SaaS genérico.
- **Densidade**: prioriza informação sobre espaço em branco decorativo;
  listas compactas em vez de grades de cards.
- **Mobile first**: layouts pensados para telas estreitas primeiro.
- Sem dados mockados: toda tela sem dados reais mostra um estado vazio de
  verdade.

## Estrutura

```
src/
  app/            # rotas (App Router): login, register, onboarding, dashboard, api/*
  components/ui/  # primitivos de UI (Button, Input, Select, Field)
  lib/            # acesso a dados, auth, validação, formatação
  generated/prisma/ # client do Prisma gerado (não versionado)
prisma/
  schema.prisma   # modelo de dados
  migrations/
tests/            # testes de negócio (Vitest) contra banco de teste real
```

## Decisões de modelagem (Fase 1)

- Sem tabelas de OAuth do NextAuth (`Account`/`Session`/`VerificationToken`):
  usamos `CredentialsProvider` com sessão JWT. Login social pode ser
  adicionado depois sem migração destrutiva.
- Saldo de conta é sempre calculado (`initialBalance` + transações), nunca
  um campo mutável — evita saldo dessincronizado quando transações forem
  implementadas na Fase 2.
- Valores monetários como `Decimal(12,2)`, nunca `float`.
- Moeda fixa por conta; sem conversão entre moedas na v1.
- IDs como `cuid()`.
