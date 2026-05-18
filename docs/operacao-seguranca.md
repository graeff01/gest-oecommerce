# Operacao e seguranca

Este runbook concentra a rotina minima para manter o app pronto para mais clientes sem perder controle operacional.

## Ambientes

- `production`: somente clientes reais.
- `staging`: mesmo codigo e variaveis equivalentes, mas com banco separado e dados de teste.
- Nunca use `DATABASE_URL` de cliente real no staging.

## Variaveis criticas

- `AUTH_SECRET`: unico por app, minimo 32 caracteres.
- `ADMIN_DATA_KEY`: unico do admin master, minimo 32 caracteres.
- `SECURITY_LOG_SALT`: recomendado para hash de IP no audit log.
- `DISABLE_ADMIN_SECRET_FALLBACK=1`: recomendado depois que `ADMIN_EMAIL`, `ADMIN_PASSWORD` e `ADMIN_NAME` estiverem configurados.
- `ADMIN_ALERT_WEBHOOK_URL`, `ADMIN_WHATSAPP_WEBHOOK_URL` ou `ADMIN_EMAIL_WEBHOOK_URL`: canal de alerta operacional.

## Checks

- Health publico do app: `GET /api/health`.
- Status master: `GET /api/admin/status` com `x-admin-secret`.
- Backup manual/testavel: `npm run backup:admin`.
- Health via script: `npm run health:check`.

## Rotina diaria

1. Rodar backup dos clientes pelo admin master.
2. Conferir `/api/admin/status`.
3. Validar se houve erro de login repetido ou alerta critico no audit log.

## Deploy seguro

1. Abrir PR.
2. Esperar o GitHub Actions passar.
3. Aplicar em staging.
4. Testar login, venda, financeiro, produto e admin master.
5. Promover para production.

## Permissoes

- Financeiro e relatorios financeiros: `ADMIN` e `FINANCE`.
- Pedidos e clientes: `ADMIN`, `SALES` e `FINANCE`.
- Produtos/estoque: `ADMIN` e `STOCK`.
- Configuracoes e usuarios: somente `ADMIN`.
