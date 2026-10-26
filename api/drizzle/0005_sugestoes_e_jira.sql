CREATE TABLE "sugestao" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"empresa" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text NOT NULL,
	"imagens" integer DEFAULT 0 NOT NULL,
	"enviada_em" timestamp with time zone,
	"erro_envio" text,
	"lida" boolean DEFAULT false NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topico" ADD COLUMN "jira_chave" text;--> statement-breakpoint
CREATE INDEX "sugestao_criada" ON "sugestao" USING btree ("criada_em");--> statement-breakpoint
ALTER TABLE "topico" ADD CONSTRAINT "topico_jira_chave_unique" UNIQUE("jira_chave");