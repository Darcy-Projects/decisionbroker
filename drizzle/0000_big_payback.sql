CREATE TYPE "public"."file_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."storage_class" AS ENUM('standard', 'infrequent');--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"status" "file_status" DEFAULT 'active' NOT NULL,
	"storage_class" "storage_class" DEFAULT 'standard' NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "files_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE INDEX "files_owner_idx" ON "files" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "files_owner_status_idx" ON "files" USING btree ("owner_user_id","status");