CREATE TABLE "acesso_dia" (
	"topico_id" integer NOT NULL,
	"dia" date NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "acesso_dia_topico_id_dia_pk" PRIMARY KEY("topico_id","dia")
);
--> statement-breakpoint
CREATE TABLE "avaliacao_dia" (
	"topico_id" integer NOT NULL,
	"dia" date NOT NULL,
	"ajudou" integer DEFAULT 0 NOT NULL,
	"nao_ajudou" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "avaliacao_dia_topico_id_dia_pk" PRIMARY KEY("topico_id","dia")
);
--> statement-breakpoint
CREATE TABLE "busca_vazia_dia" (
	"termo" text NOT NULL,
	"dia" date NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "busca_vazia_dia_termo_dia_pk" PRIMARY KEY("termo","dia")
);
--> statement-breakpoint
ALTER TABLE "modulo" ADD COLUMN "subtitulo" text;--> statement-breakpoint
ALTER TABLE "acesso_dia" ADD CONSTRAINT "acesso_dia_topico_id_topico_id_fk" FOREIGN KEY ("topico_id") REFERENCES "public"."topico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "avaliacao_dia" ADD CONSTRAINT "avaliacao_dia_topico_id_topico_id_fk" FOREIGN KEY ("topico_id") REFERENCES "public"."topico"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alteracao_topico" ON "alteracao" USING btree ("topico_id","em");--> statement-breakpoint
-- Subtítulos que antes ficavam fixos nas páginas do site.
UPDATE "modulo" SET "subtitulo" = 'Produtos, entradas, inventário e transferências entre filiais.' WHERE "slug" = 'estoque' AND "subtitulo" IS NULL;
--> statement-breakpoint
UPDATE "modulo" SET "subtitulo" = 'Contas a pagar, baixa de títulos, conciliação e fluxo de caixa.' WHERE "slug" = 'financeiro' AND "subtitulo" IS NULL;
--> statement-breakpoint
UPDATE "modulo" SET "subtitulo" = 'Geração, validação e correção do arquivo fiscal.' WHERE "slug" = 'sintegra' AND "subtitulo" IS NULL;
--> statement-breakpoint
UPDATE "modulo" SET "subtitulo" = 'O básico para começar a usar o Acesse no dia a dia.' WHERE "slug" = 'primeiros-passos' AND "subtitulo" IS NULL;
--> statement-breakpoint
UPDATE "modulo" SET "subtitulo" = 'Vendas, curva ABC e demais análises do sistema.' WHERE "slug" = 'relatorios' AND "subtitulo" IS NULL;
--> statement-breakpoint
UPDATE "modulo" SET "subtitulo" = 'Rotinas, programas e validações fiscais implantados no Acesse, do mais recente para o mais antigo.' WHERE "slug" = 'novidades' AND "subtitulo" IS NULL;
