CREATE TABLE "acesso_painel" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"email" text,
	"evento" text NOT NULL,
	"ip" text,
	"navegador" text,
	"em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessao" ADD COLUMN "ultimo_uso" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sessao" ADD COLUMN "etapa" text DEFAULT 'completa' NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "falhas_login" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "bloqueado_ate" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "totp_segredo" text;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "totp_pendente" text;--> statement-breakpoint
ALTER TABLE "usuario" ADD COLUMN "totp_ultimo_passo" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "acesso_painel" ADD CONSTRAINT "acesso_painel_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "acesso_painel_em" ON "acesso_painel" USING btree ("em");