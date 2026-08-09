-- Add isApproved column to Rider for admin approval workflow
ALTER TABLE "Rider" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT false;
