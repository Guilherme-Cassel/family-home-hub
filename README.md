# Casa em Ordem

App web familiar para controlar o estoque da despensa e as manutenções periódicas da casa. Multi-usuário, mesmo lar: todo mundo que entra vê e edita tudo, e cada registro guarda quem fez o quê.

O fluxo principal é a reposição por foto: você fotografa as compras no mercado, a IA identifica cada produto, o app casa com o que já está cadastrado e você revisa antes de qualquer coisa ser gravada.

## O que dá para fazer

- **Acesso fechado** — sem tela de cadastro: as contas são criadas à mão no painel do Supabase, porque o app fica exposto na internet.
- **Estoque** — cadastro, busca, filtro por categoria, e botões de consumir/repor direto na listagem. Selos de "abaixo do mínimo", "vence em N dias" e "vencido".
- **Lista de compras** — montada sozinha com o que furou a quantidade mínima, mais itens avulsos para compras pontuais.
- **Entrada em massa** — por foto (com IA) ou digitando numa tabela com autocomplete.
- **Manutenção** — semáforo por urgência, "marcar como feito" em um toque, histórico com data e autor.
- **Receitas** — sugestões a partir dos alimentos em estoque, priorizando o que está perto de vencer.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Banco e auth | Supabase (Postgres + Auth), plano gratuito |
| IA | Google Gemini (modelo Flash), plano gratuito |
| Deploy | Vercel, plano Hobby |

Sem biblioteca de componentes, sem biblioteca de ícones e sem biblioteca de fuzzy matching — tudo isso é código próprio, pequeno, em `components/` e `lib/`.

---

## Rodando localmente

Precisa de Node 20 ou mais novo.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Criar o projeto no Supabase

1. Crie um projeto em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Abra **SQL Editor** e execute os arquivos de `supabase/migrations/` **na ordem numérica**:
   - `0001_schema.sql` — tabelas, colunas geradas e triggers
   - `0002_rls.sql` — políticas de acesso
   - `0003_functions.sql` — operações atômicas
3. Em **Project Settings → API**, copie a URL do projeto e a chave pública.

Os scripts são idempotentes: rodar de novo não quebra nada.

### 2.1. Fechar o cadastro aberto — obrigatório

O app **não tem tela de criar conta**, de propósito: ele fica exposto na internet, e auto-cadastro aberto deixaria qualquer um entrar, mexer nos dados da casa e gastar a cota da API do Gemini.

**Mas remover a tela não protege nada sozinho.** A chave pública do Supabase vai no bundle do navegador por natureza, e com ela dá para chamar o endpoint de cadastro direto, sem passar pela interface. O bloqueio de verdade é no painel:

**Authentication → Sign In / Providers → Email → desmarque _Allow new users to sign up_ → Save.**

Enquanto isso estiver ligado, o cadastro continua aberto mesmo sem tela nenhuma no app.

### 2.2. Criar as contas da família

Com o cadastro fechado, as contas passam a ser criadas à mão:

**Authentication → Users → Add user** → e-mail e senha → marque **Auto Confirm User** (senão a pessoa fica presa esperando um e-mail de confirmação).

O perfil correspondente é criado sozinho no primeiro acesso, então não é preciso mexer em mais nada. O nome exibido vira o começo do e-mail; para escolher outro, preencha `display_name` em **User Metadata** na hora de criar.

### 3. Gerar a chave do Gemini

Pegue uma chave em [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Não precisa de cartão de crédito.

### 4. Configurar as variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha:

| Variável | Onde encontrar |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | idem (projetos antigos chamam de *anon key*; nesse caso use `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `GEMINI_API_KEY` | Google AI Studio |
| `GEMINI_MODEL` | opcional, padrão `gemini-3.5-flash-lite` |
| `GEMINI_BATCH_SIZE` | opcional, padrão `6` |

`GEMINI_API_KEY` **não** tem prefixo `NEXT_PUBLIC_` de propósito: ela só existe no servidor. O arquivo `lib/gemini.ts` é marcado com `server-only`, então o build quebra se algum componente de cliente tentar importá-lo.

### 5. Subir

```bash
npm run dev
```

Abra `http://localhost:3000` e entre com a conta que você criou no painel do Supabase.

Outros comandos:

```bash
npm run build
```

```bash
npm run typecheck
```

```bash
npm run lint
```

---

## Deploy na Vercel

1. Suba o repositório no GitHub.
2. Importe o projeto em [vercel.com/new](https://vercel.com/new) — a Vercel reconhece o Next.js sozinho.
3. Em **Settings → Environment Variables**, repita as mesmas quatro variáveis do `.env.local`, para os ambientes Production e Preview.
4. Faça o deploy.

O app é mobile-first. Vale abrir no celular e usar "Adicionar à tela de início" para ele abrir como um app.

---

## Limitações que valem saber

### Supabase pausa depois de 7 dias sem uso

Projetos no plano gratuito do Supabase são **pausados automaticamente após 7 dias de inatividade**. Quando isso acontece, o login para de funcionar até alguém reativar o projeto pelo painel — leva alguns minutos e não perde dados.

Para evitar isso, `vercel.json` agenda um **ping diário** em `/api/cron/keep-alive`, que faz uma consulta mínima ao banco e reinicia a contagem. A consulta é anônima de propósito: sem sessão a RLS devolve zero linhas, mas a requisição atravessa o PostgREST até o Postgres do mesmo jeito, que é o que conta como atividade.

Três decisões nesse desenho:

- **Vercel Cron, não GitHub Actions.** O GitHub **desativa workflows agendados após 60 dias sem atividade no repositório** — um workflow criado para combater inatividade seria desligado justamente por inatividade, em silêncio.
- **Diário, não semanal.** O plano Hobby limita crons a uma execução por dia e tem precisão de ±59 minutos. Agendar semanalmente raspa no limite de 7 dias sem margem; diário custa uma invocação trivial e dá folga de 7×.
- **A rota fica fora do matcher do proxy.** Quem chama é o agendador, que não tem sessão — sem essa exceção o ping seria redirecionado para o login e nunca encostaria no banco, falhando em silêncio até o projeto ser pausado. A autenticação dela é própria, por `CRON_SECRET`.

Configure `CRON_SECRET` nas variáveis da Vercel com um valor aleatório; a Vercel o envia no cabeçalho `Authorization` ao disparar o cron. Sem ele o endpoint continua funcionando, mas fica aberto — e a resposta avisa isso.

### A escolha do modelo do Gemini

O padrão é `gemini-3.5-flash-lite`, e isso saiu de medição, não de preferência. Testando o mesmo payload que o app manda de verdade — 6 imagens de 1024x768:

| Modelo | Resultado | Tempo |
| --- | --- | --- |
| `gemini-3.5-flash-lite` | ok | **5s** |
| `gemini-3.6-flash` | ok | 9s |
| `gemini-3.5-flash` | ok | 34s (chegou a 112s numa chamada) |
| `gemini-3.7-flash` | 503 | — |

O lite ganha em três eixos ao mesmo tempo: é o mais rápido, foi o que teve mais cota (500 requisições/dia contra poucas dezenas dos modelos maiores) e para reconhecer embalagem de supermercado a qualidade empata com os irmãos maiores.

A latência não é detalhe cosmético: função serverless tem prazo, e o `gemini-3.5-flash` demorando 34s estourava o limite da Vercel antes de responder. Por isso as duas rotas de IA declaram `maxDuration = 60`.

**Os modelos "Live" não servem aqui**, mesmo anunciando requisições ilimitadas: eles só expõem `bidiGenerateContent`, uma API de streaming por WebSocket para conversa em tempo real. Não aceitam `generateContent`, que é o "manda N fotos, devolve JSON" que este app faz.

### Quando a IA fica indisponível

O `503 UNAVAILABLE` do Gemini é falta de capacidade **por modelo, do lado do Google** — não tem relação com a sua cota nem com o horário. Na medição acima, o `gemini-3.7-flash` estava fora no mesmo minuto em que o lite e o 3.6 respondiam normalmente.

Por isso a resiliência é **trocar de modelo**, não repetir no mesmo: `GEMINI_MODEL_FALLBACK` define a fila de modelos tentados em sequência quando o principal responde 503. Erros de cota, de chave ou de payload sobem na hora, sem tentar os outros — não melhorariam com outro modelo e só gastariam o prazo da função.

### A cota gratuita é finita

Cada conta vê a sua em [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit); o Google parou de publicar a tabela geral. A cota reseta à meia-noite no horário do Pacífico. Com o flash-lite em 500 requisições/dia e lotes de 6 fotos, dá 3.000 fotos por dia — folgado para uso familiar. O desenho ainda economiza:

- **As fotos vão em lote**, `GEMINI_BATCH_SIZE` por requisição (padrão 6). Uma compra de 12 fotos custa 2 requisições, não 12.
- **Chamadas só sob demanda.** Nada de identificação em segundo plano ou receitas carregadas junto com a tela — só quando você toca no botão.
- **Estourar a cota é caminho previsto, não erro genérico.** A tela explica o que houve em português e oferece o atalho para digitar os itens manualmente, sem perder o que já foi identificado.

Uma observação de privacidade: no free tier, o Google diz que **usa o conteúdo enviado para melhorar os produtos deles**. Para foto de embalagem de arroz isso é irrelevante, mas fica registrado.

### As fotos não são guardadas

As imagens vivem só na memória do navegador durante a captura e a revisão, e no corpo da requisição para a rota de IA. Nada vai para o Supabase Storage. Isso poupa os 500 MB do plano gratuito e evita ter que gerenciar retenção de imagens.

### As sugestões de receita são geradas por IA

Podem conter imprecisões de quantidade, tempo ou modo de preparo. O app avisa isso na tela. Não é fonte validada de culinária.

---

## Estrutura

```
app/
  (auth)/          entrar e criar conta
  (app)/           área logada: dashboard, estoque, compras, entrada, manutenção, receitas
  api/             rotas serverless que falam com o Gemini
components/        kit de UI próprio + componentes por área
lib/
  supabase/        clientes de navegador, servidor e proxy
  actions/         Server Actions compartilhadas entre telas
  gemini.ts        cliente do Gemini (server-only)
  geminiClient.ts  chamadas do navegador para /api
  fuzzyMatch.ts    casamento aproximado de nomes de produto
  jsonIA.ts        parser defensivo do JSON do modelo
  status.ts        regras dos selos de estoque e do semáforo de manutenção
supabase/
  migrations/      SQL para colar no SQL Editor
types/             tipos do banco e do contrato com a IA
proxy.ts           renovação de sessão a cada requisição
```

### Decisões que talvez não sejam óbvias

- **`proxy.ts`, não `middleware.ts`.** O Next 16 renomeou a convenção; `middleware` está descontinuado.
- **Colunas geradas no Postgres.** `stock_items.is_below_minimum` e `maintenance_items.next_due_date` são materializadas no banco. O PostgREST não compara duas colunas num filtro, então isso deixa a lista de compras e a ordenação por urgência saírem de uma query simples, sem view.
- **Trigger em `stock_movements`.** Quem ajusta o saldo do item é o banco, não a aplicação. Assim consumo manual, entrada digitada e entrada por foto nunca saem de sincronia com o histórico.
- **`requireUser()` em toda Server Action.** Server Actions são requisições POST para a própria rota e podem escapar do matcher do proxy, então a sessão é revalidada dentro de cada uma.
- **Tabela `profiles`.** `auth.users` não é legível pelo cliente; sem esse espelho não daria para mostrar "feito por Fulano".
- **O cadastro vai junto com as fotos para a IA.** Comparar texto não resolve "Leite integral" contra "Caixinha de Leite 1L" (pontuam 0.50, e o limiar é 0.80), nem "Café em pó" contra "Café Pilão 500g" (0.43) — são o mesmo produto com nomes distantes, e reconhecer isso é conhecimento semântico. A rota manda a lista numerada no prompt e a IA aponta o índice, que é resolvido no servidor contra a lista real, então um índice inventado nunca vira vínculo. O casamento por similaridade (`lib/fuzzyMatch.ts`) continua como segundo sinal. Efeito colateral observado em uso: a lista também melhora a *identificação*, não só o vínculo, porque diz ao modelo que tipo de coisa esta casa controla.
- **Busca e filtro no cliente.** A casa tem dezenas de itens, não milhares. Filtrar em memória evita um round-trip por tecla digitada no celular.
