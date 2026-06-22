CREATE TYPE "public"."actor_kind" AS ENUM('user', 'agent');--> statement-breakpoint
CREATE TYPE "public"."decision_kind" AS ENUM('approval', 'choice', 'judgment', 'clarification', 'escalation');--> statement-breakpoint
CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "actor_kind" NOT NULL,
	"display_name" text NOT NULL,
	"role" text,
	"workos_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "actors_workos_user_id_unique" UNIQUE("workos_user_id")
);
--> statement-breakpoint
CREATE TABLE "board_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"is_initial" boolean DEFAULT false NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"color" text NOT NULL,
	"ref_prefix" text DEFAULT 'DEC-' NOT NULL,
	"ref_seq" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"actor_id" uuid,
	"label" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"label" text NOT NULL,
	"detail" text,
	"recommended" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_tags" (
	"decision_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "decision_tags_decision_id_tag_id_pk" PRIMARY KEY("decision_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"ref_number" integer NOT NULL,
	"title" text,
	"question" text NOT NULL,
	"context" text,
	"kind" "decision_kind" NOT NULL,
	"step_id" uuid NOT NULL,
	"priority_id" uuid NOT NULL,
	"questioner_id" uuid NOT NULL,
	"assignee_id" uuid,
	"question_at" timestamp with time zone NOT NULL,
	"session_id" uuid,
	"auto_resolved" boolean DEFAULT false NOT NULL,
	"answer_text" text,
	"chosen_option_id" uuid,
	"answered_by_id" uuid,
	"answered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"project" text,
	"agent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_priorities" ADD CONSTRAINT "board_priorities_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_steps" ADD CONSTRAINT "board_steps_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_tags" ADD CONSTRAINT "board_tags_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "boards" ADD CONSTRAINT "boards_owner_id_actors_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_events" ADD CONSTRAINT "decision_events_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_events" ADD CONSTRAINT "decision_events_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_messages" ADD CONSTRAINT "decision_messages_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_messages" ADD CONSTRAINT "decision_messages_author_id_actors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_options" ADD CONSTRAINT "decision_options_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_tags" ADD CONSTRAINT "decision_tags_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_tags" ADD CONSTRAINT "decision_tags_tag_id_board_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."board_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_step_id_board_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."board_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_priority_id_board_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."board_priorities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_questioner_id_actors_id_fk" FOREIGN KEY ("questioner_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_assignee_id_actors_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_chosen_option_id_decision_options_id_fk" FOREIGN KEY ("chosen_option_id") REFERENCES "public"."decision_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_answered_by_id_actors_id_fk" FOREIGN KEY ("answered_by_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_agent_id_actors_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "actors_kind_idx" ON "actors" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "board_priorities_board_name_uq" ON "board_priorities" USING btree ("board_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "board_priorities_one_default_uq" ON "board_priorities" USING btree ("board_id") WHERE "board_priorities"."is_default";--> statement-breakpoint
CREATE UNIQUE INDEX "board_steps_board_name_uq" ON "board_steps" USING btree ("board_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "board_steps_one_initial_uq" ON "board_steps" USING btree ("board_id") WHERE "board_steps"."is_initial";--> statement-breakpoint
CREATE UNIQUE INDEX "board_steps_one_terminal_uq" ON "board_steps" USING btree ("board_id") WHERE "board_steps"."is_terminal";--> statement-breakpoint
CREATE UNIQUE INDEX "board_tags_board_name_uq" ON "board_tags" USING btree ("board_id","name");--> statement-breakpoint
CREATE INDEX "boards_archived_idx" ON "boards" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "decision_events_decision_idx" ON "decision_events" USING btree ("decision_id","created_at");--> statement-breakpoint
CREATE INDEX "decision_messages_decision_idx" ON "decision_messages" USING btree ("decision_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "decisions_board_ref_uq" ON "decisions" USING btree ("board_id","ref_number");--> statement-breakpoint
CREATE INDEX "decisions_board_step_idx" ON "decisions" USING btree ("board_id","step_id");