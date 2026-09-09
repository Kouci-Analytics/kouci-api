CREATE TYPE "license_plan" AS ENUM('BASIC', 'PRO', 'CUSTOM', 'MVP_TESTER');--> statement-breakpoint
CREATE TYPE "license_status" AS ENUM('ACTIVE', 'DISABLED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"license_id" uuid NOT NULL,
	"install_id_hash" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"app_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code_hash" text NOT NULL UNIQUE,
	"club_name" text NOT NULL,
	"plan" "license_plan" NOT NULL,
	"max_players" integer NOT NULL,
	"status" "license_status" DEFAULT 'ACTIVE'::"license_status" NOT NULL,
	"max_activations" integer DEFAULT 1 NOT NULL,
	"premium_reports" boolean DEFAULT false NOT NULL,
	"developer_mode" boolean DEFAULT false NOT NULL,
	"custom_theme" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "licenses_max_players_positive" CHECK ("max_players" > 0),
	CONSTRAINT "licenses_max_activations_positive" CHECK ("max_activations" > 0)
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL CONSTRAINT "wishlist_email_unique" UNIQUE,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "activations_license_install_unique" ON "activations" ("license_id","install_id_hash");--> statement-breakpoint
ALTER TABLE "activations" ADD CONSTRAINT "activations_license_id_licenses_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE;