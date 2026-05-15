# Passômetro UTI

App de passagem de plantão para UTI — dados compartilhados em tempo real via Supabase.

## Stack
- Frontend: HTML + CSS + JS puro (sem build)
- Banco: Supabase (PostgreSQL + Realtime)
- Hosting: GitHub Pages (grátis)

---

## Setup em 3 passos

### 1. Criar conta Supabase

1. Acesse https://supabase.com e crie uma conta gratuita
2. Crie um novo projeto (anote a senha do banco)
3. Vá em **SQL Editor** e execute o conteúdo de `supabase-schema.sql`
4. Vá em **Settings > API** e copie:
   - **Project URL** (ex: `https://xyzxyz.supabase.co`)
   - **anon public key** (começa com `eyJ...`)

### 2. Configurar o app

Edite `app.js` e substitua as duas linhas no topo:

```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_KEY = 'SUA_ANON_KEY';
```

### 3. Deploy no GitHub Pages

1. Crie um repositório público no GitHub
2. Suba os arquivos (index.html, style.css, app.js)
3. Vá em **Settings > Pages > Branch: main** e salve
4. Aguarde ~1 minuto — o link aparece: `https://SEU_USUARIO.github.io/REPOSITORIO`

---

## Funcionalidades

- ✅ Cadastro de pacientes com leito, diagnóstico, prioridade
- ✅ Cálculo automático de DIH (dias de internação hospitalar)
- ✅ Antibióticos com contador de dias
- ✅ Filtro por prioridade e autor
- ✅ Busca em tempo real
- ✅ **Atualização automática** entre todos os usuários conectados
- ✅ Impressão / PDF
- ✅ Mobile-friendly (funciona no celular à beira do leito)

## Campos por paciente

| Campo | Descrição |
|---|---|
| Nome | Nome do paciente |
| Leito | Número do leito |
| Diagnóstico | Diagnóstico principal |
| Prioridade | Alta / Média / Baixa |
| Data internação | Calcula DIH automaticamente |
| Condição atual | Status hemodinâmico, ventilação etc. |
| Pendências | Exames aguardados, condutas pendentes |
| Próximos passos | Plano para próximo plantão |
| Antibióticos | Nome + dia de uso (D1, D2...) |
| Autor | Nome do plantonista |
