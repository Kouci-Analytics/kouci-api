CREATE TYPE "platform" AS ENUM('ios', 'android', 'web');--> statement-breakpoint
CREATE TABLE "device" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"platform" "platform" NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"mac_address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"country" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"club_uuid" uuid
);
--> statement-breakpoint
CREATE TABLE "wishlist" (
	"uuid" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
DROP TABLE "example_items";--> statement-breakpoint
ALTER TABLE "coach" ADD CONSTRAINT "coach_club_uuid_club_uuid_fkey" FOREIGN KEY ("club_uuid") REFERENCES "club"("uuid");