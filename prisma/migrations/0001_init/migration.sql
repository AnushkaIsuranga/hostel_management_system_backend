-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "passwordHash" VARCHAR(500) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL DEFAULT '',
    "role" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hostel" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "ownerId" UUID NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByAdminId" UUID,
    "verificationStatus" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "city" VARCHAR(100) NOT NULL,
    "address" TEXT NOT NULL,
    "minPrice" DECIMAL(18,2) NOT NULL,
    "maxPrice" DECIMAL(18,2) NOT NULL,
    "genderPolicy" TEXT NOT NULL DEFAULT '',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "googleMapsUrl" TEXT NOT NULL DEFAULT '',
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelListing" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HostelListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "roomType" VARCHAR(100) NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelAmenity" (
    "hostelId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,

    CONSTRAINT "HostelAmenity_pkey" PRIMARY KEY ("hostelId","amenityId")
);

-- CreateTable
CREATE TABLE "InteractionEvent" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "hostelId" UUID,
    "eventType" INTEGER NOT NULL,
    "eventData" TEXT,
    "sessionId" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "InteractionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelReview" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HostelReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelImage" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "contentType" VARCHAR(100) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "imageUrl" VARCHAR(1000) NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HostelImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelVerificationRequest" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 1,
    "adminNotes" VARCHAR(1000),
    "reviewedByAdminId" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HostelVerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostelSubscription" (
    "id" UUID NOT NULL,
    "hostelId" UUID NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastReminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HostelSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "universityId" UUID NOT NULL,
    "minBudget" DECIMAL(18,2),
    "maxBudget" DECIMAL(18,2),
    "requiredCapacity" INTEGER,
    "selectedAmenitiesJson" VARCHAR(4000) NOT NULL DEFAULT '[]',
    "priorityOrderJson" VARCHAR(200) NOT NULL DEFAULT '[]',
    "priceWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "distanceWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "ratingWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "StudentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");

-- CreateIndex
CREATE INDEX "Hostel_city_idx" ON "Hostel"("city");

-- CreateIndex
CREATE INDEX "Hostel_status_idx" ON "Hostel"("status");

-- CreateIndex
CREATE INDEX "Hostel_ownerId_idx" ON "Hostel"("ownerId");

-- CreateIndex
CREATE INDEX "Hostel_verificationStatus_idx" ON "Hostel"("verificationStatus");

-- CreateIndex
CREATE INDEX "Hostel_latitude_longitude_idx" ON "Hostel"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Hostel_isDeleted_idx" ON "Hostel"("isDeleted");

-- CreateIndex
CREATE INDEX "HostelListing_isDeleted_idx" ON "HostelListing"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "HostelListing_hostelId_ownerUserId_key" ON "HostelListing"("hostelId", "ownerUserId");

-- CreateIndex
CREATE INDEX "Room_hostelId_idx" ON "Room"("hostelId");

-- CreateIndex
CREATE INDEX "Room_isDeleted_idx" ON "Room"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "Amenity"("name");

-- CreateIndex
CREATE INDEX "Amenity_isDeleted_idx" ON "Amenity"("isDeleted");

-- CreateIndex
CREATE INDEX "HostelAmenity_amenityId_idx" ON "HostelAmenity"("amenityId");

-- CreateIndex
CREATE INDEX "InteractionEvent_userId_idx" ON "InteractionEvent"("userId");

-- CreateIndex
CREATE INDEX "InteractionEvent_hostelId_idx" ON "InteractionEvent"("hostelId");

-- CreateIndex
CREATE INDEX "InteractionEvent_userId_eventType_idx" ON "InteractionEvent"("userId", "eventType");

-- CreateIndex
CREATE INDEX "InteractionEvent_isDeleted_idx" ON "InteractionEvent"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_revoked_idx" ON "RefreshToken"("userId", "revoked");

-- CreateIndex
CREATE INDEX "HostelReview_hostelId_idx" ON "HostelReview"("hostelId");

-- CreateIndex
CREATE INDEX "HostelReview_isDeleted_idx" ON "HostelReview"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "HostelReview_hostelId_userId_key" ON "HostelReview"("hostelId", "userId");

-- CreateIndex
CREATE INDEX "HostelImage_hostelId_idx" ON "HostelImage"("hostelId");

-- CreateIndex
CREATE INDEX "HostelImage_hostelId_displayOrder_idx" ON "HostelImage"("hostelId", "displayOrder");

-- CreateIndex
CREATE INDEX "HostelImage_isDeleted_idx" ON "HostelImage"("isDeleted");

-- CreateIndex
CREATE INDEX "HostelVerificationRequest_hostelId_idx" ON "HostelVerificationRequest"("hostelId");

-- CreateIndex
CREATE INDEX "HostelVerificationRequest_status_idx" ON "HostelVerificationRequest"("status");

-- CreateIndex
CREATE INDEX "HostelVerificationRequest_isDeleted_idx" ON "HostelVerificationRequest"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "HostelSubscription_hostelId_key" ON "HostelSubscription"("hostelId");

-- CreateIndex
CREATE INDEX "HostelSubscription_expiryDate_idx" ON "HostelSubscription"("expiryDate");

-- CreateIndex
CREATE INDEX "HostelSubscription_isDeleted_idx" ON "HostelSubscription"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "University_name_key" ON "University"("name");

-- CreateIndex
CREATE INDEX "University_isDeleted_idx" ON "University"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPreference_userId_key" ON "StudentPreference"("userId");

-- CreateIndex
CREATE INDEX "StudentPreference_universityId_idx" ON "StudentPreference"("universityId");

-- CreateIndex
CREATE INDEX "StudentPreference_isDeleted_idx" ON "StudentPreference"("isDeleted");

-- AddForeignKey
ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_verifiedByAdminId_fkey" FOREIGN KEY ("verifiedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelListing" ADD CONSTRAINT "HostelListing_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelListing" ADD CONSTRAINT "HostelListing_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelAmenity" ADD CONSTRAINT "HostelAmenity_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelAmenity" ADD CONSTRAINT "HostelAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InteractionEvent" ADD CONSTRAINT "InteractionEvent_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelReview" ADD CONSTRAINT "HostelReview_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelReview" ADD CONSTRAINT "HostelReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelImage" ADD CONSTRAINT "HostelImage_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelVerificationRequest" ADD CONSTRAINT "HostelVerificationRequest_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelVerificationRequest" ADD CONSTRAINT "HostelVerificationRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelVerificationRequest" ADD CONSTRAINT "HostelVerificationRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelSubscription" ADD CONSTRAINT "HostelSubscription_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPreference" ADD CONSTRAINT "StudentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPreference" ADD CONSTRAINT "StudentPreference_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

