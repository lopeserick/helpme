CREATE TABLE "alteracao" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"topico_id" integer,
	"usuario_id" integer,
	"acao" text NOT NULL,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	"detalhe" jsonb
);
--> statement-breakpoint
CREATE TABLE "imagem" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arquivo" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"largura" integer,
	"altura" integer,
	"enviada_por" integer,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modulo" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"titulo_busca" text DEFAULT '' NOT NULL,
	"descricao" text NOT NULL,
	"icone" text NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"visivel" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modulo_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topico" (
	"id" serial PRIMARY KEY NOT NULL,
	"modulo_id" integer NOT NULL,
	"slug" text NOT NULL,
	"titulo" text NOT NULL,
	"tag" text,
	"blocos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"texto_busca" text DEFAULT '' NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL,
	"publicado_em" timestamp with time zone,
	"excluido_em" timestamp with time zone,
	"criado_por" integer,
	"atualizado_por" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topico_modulo_slug" UNIQUE("modulo_id","slug")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "alteracao" ADD CONSTRAINT "alteracao_topico_id_topico_id_fk" FOREIGN KEY ("topico_id") REFERENCES "public"."topico"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alteracao" ADD CONSTRAINT "alteracao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imagem" ADD CONSTRAINT "imagem_enviada_por_usuario_id_fk" FOREIGN KEY ("enviada_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topico" ADD CONSTRAINT "topico_modulo_id_modulo_id_fk" FOREIGN KEY ("modulo_id") REFERENCES "public"."modulo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topico" ADD CONSTRAINT "topico_criado_por_usuario_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topico" ADD CONSTRAINT "topico_atualizado_por_usuario_id_fk" FOREIGN KEY ("atualizado_por") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "topico_busca" ON "topico" USING btree ("texto_busca");--> statement-breakpoint
CREATE INDEX "topico_publicado" ON "topico" USING btree ("publicado_em");