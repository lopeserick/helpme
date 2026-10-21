-- Faz a categoria Relatórios aparecer na Home, com ícone próprio.
-- Migração de dados (e não só o seed) para valer em bancos que já existem sem
-- sobrescrever tópicos editados pelo painel, o que rodar o seed de novo faria.
UPDATE "modulo" SET "visivel" = true, "icone" = 'chart' WHERE "slug" = 'relatorios';
