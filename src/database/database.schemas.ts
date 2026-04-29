import { randomUUID } from 'node:crypto';

import { Schema } from 'mongoose';

export const USER_MODEL = 'User';
export const HOSTEL_MODEL = 'Hostel';
export const HOSTEL_LISTING_MODEL = 'HostelListing';
export const ROOM_MODEL = 'Room';
export const AMENITY_MODEL = 'Amenity';
export const HOSTEL_AMENITY_MODEL = 'HostelAmenity';
export const INTERACTION_EVENT_MODEL = 'InteractionEvent';
export const REFRESH_TOKEN_MODEL = 'RefreshToken';
export const HOSTEL_REVIEW_MODEL = 'HostelReview';
export const HOSTEL_IMAGE_MODEL = 'HostelImage';
export const HOSTEL_VERIFICATION_REQUEST_MODEL = 'HostelVerificationRequest';
export const HOSTEL_SUBSCRIPTION_MODEL = 'HostelSubscription';
export const UNIVERSITY_MODEL = 'University';
export const STUDENT_PREFERENCE_MODEL = 'StudentPreference';

export type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  role: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date | null;
  isDeleted: boolean;
  deletedAt: Date | null;
};

const schemaOptions = {
  versionKey: false as const,
  timestamps: false,
};

const idField = {
  type: String,
  default: () => randomUUID(),
  index: true,
  unique: true,
};

const softDeleteFields = {
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
};

export const UserSchema = new Schema(
  {
    id: idField,
    fullName: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, unique: true, index: true },
    passwordHash: { type: String, required: true, maxlength: 500 },
    phoneNumber: { type: String, default: '', maxlength: 20 },
    role: { type: Number, default: 0, index: true },
    lastActivityAt: { type: Date, default: () => new Date() },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'users' },
);

export const HostelSchema = new Schema(
  {
    id: idField,
    name: { type: String, required: true, trim: true, maxlength: 200 },
    ownerId: { type: String, required: true, index: true },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date, default: null },
    verifiedByAdminId: { type: String, default: null },
    verificationStatus: { type: Number, default: 0, index: true },
    description: { type: String, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 100, index: true },
    address: { type: String, required: true },
    minPrice: { type: Number, required: true },
    maxPrice: { type: Number, required: true },
    genderPolicy: { type: String, default: '' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    googleMapsUrl: { type: String, default: '' },
    status: { type: Number, default: 0, index: true },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'hostels' },
);
HostelSchema.index({ latitude: 1, longitude: 1 });

export const HostelListingSchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, index: true },
    ownerUserId: { type: String, required: true, index: true },
    status: { type: Number, default: 0 },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'hostel_listings' },
);
HostelListingSchema.index({ hostelId: 1, ownerUserId: 1 }, { unique: true });

export const RoomSchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, index: true },
    roomType: { type: String, required: true, trim: true, maxlength: 100 },
    price: { type: Number, required: true },
    capacity: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'rooms' },
);

export const AmenitySchema = new Schema(
  {
    id: idField,
    name: { type: String, required: true, trim: true, maxlength: 100, unique: true, index: true },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'amenities' },
);

export const HostelAmenitySchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, index: true },
    amenityId: { type: String, required: true, index: true },
  },
  { ...schemaOptions, collection: 'hostel_amenities' },
);
HostelAmenitySchema.index({ hostelId: 1, amenityId: 1 }, { unique: true });

export const InteractionEventSchema = new Schema(
  {
    id: idField,
    userId: { type: String, default: null, index: true },
    hostelId: { type: String, default: null, index: true },
    eventType: { type: Number, required: true, index: true },
    eventData: { type: Schema.Types.Mixed, default: null },
    sessionId: { type: String, required: true, maxlength: 100 },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'interaction_events' },
);
InteractionEventSchema.index({ userId: 1, eventType: 1 });

export const RefreshTokenSchema = new Schema(
  {
    id: idField,
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true, maxlength: 64 },
    expiresAt: { type: Date, required: true },
    rememberMe: { type: Boolean, default: false },
    revoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  { ...schemaOptions, collection: 'refresh_tokens' },
);
RefreshTokenSchema.index({ userId: 1, revoked: 1 });

export const HostelReviewSchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    rating: { type: Number, required: true },
    comment: { type: String, default: null, maxlength: 1000 },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'hostel_reviews' },
);
HostelReviewSchema.index({ hostelId: 1, userId: 1 }, { unique: true });

export const HostelImageSchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, index: true },
    fileName: { type: String, required: true, maxlength: 255 },
    contentType: { type: String, required: true, maxlength: 100 },
    fileSize: { type: Number, required: true },
    imageUrl: { type: String, required: true, maxlength: 1000 },
    displayOrder: { type: Number, required: true },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'hostel_images' },
);
HostelImageSchema.index({ hostelId: 1, displayOrder: 1 });

export const HostelVerificationRequestSchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, index: true },
    requestedByUserId: { type: String, required: true, index: true },
    status: { type: Number, default: 1, index: true },
    adminNotes: { type: String, default: null, maxlength: 1000 },
    reviewedByAdminId: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'hostel_verification_requests' },
);

export const HostelSubscriptionSchema = new Schema(
  {
    id: idField,
    hostelId: { type: String, required: true, unique: true, index: true },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    isActive: { type: Boolean, default: true },
    lastReminderSentAt: { type: Date, default: null },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'hostel_subscriptions' },
);

export const UniversitySchema = new Schema(
  {
    id: idField,
    name: { type: String, required: true, trim: true, maxlength: 200, unique: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'universities' },
);

export const StudentPreferenceSchema = new Schema(
  {
    id: idField,
    userId: { type: String, required: true, unique: true, index: true },
    universityId: { type: String, required: true, index: true },
    minBudget: { type: Number, default: null },
    maxBudget: { type: Number, default: null },
    requiredCapacity: { type: Number, default: null },
    selectedAmenitiesJson: { type: String, default: '[]', maxlength: 4000 },
    priorityOrderJson: { type: String, default: '[]', maxlength: 200 },
    priceWeight: { type: Number, default: 0.5 },
    distanceWeight: { type: Number, default: 0.3 },
    ratingWeight: { type: Number, default: 0.2 },
    ...softDeleteFields,
  },
  { ...schemaOptions, collection: 'student_preferences' },
);

export const databaseModels = [
  { name: USER_MODEL, schema: UserSchema },
  { name: HOSTEL_MODEL, schema: HostelSchema },
  { name: HOSTEL_LISTING_MODEL, schema: HostelListingSchema },
  { name: ROOM_MODEL, schema: RoomSchema },
  { name: AMENITY_MODEL, schema: AmenitySchema },
  { name: HOSTEL_AMENITY_MODEL, schema: HostelAmenitySchema },
  { name: INTERACTION_EVENT_MODEL, schema: InteractionEventSchema },
  { name: REFRESH_TOKEN_MODEL, schema: RefreshTokenSchema },
  { name: HOSTEL_REVIEW_MODEL, schema: HostelReviewSchema },
  { name: HOSTEL_IMAGE_MODEL, schema: HostelImageSchema },
  { name: HOSTEL_VERIFICATION_REQUEST_MODEL, schema: HostelVerificationRequestSchema },
  { name: HOSTEL_SUBSCRIPTION_MODEL, schema: HostelSubscriptionSchema },
  { name: UNIVERSITY_MODEL, schema: UniversitySchema },
  { name: STUDENT_PREFERENCE_MODEL, schema: StudentPreferenceSchema },
];
