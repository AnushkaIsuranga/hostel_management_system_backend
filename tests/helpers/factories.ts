import { HostelVerificationStatus, UserRole } from '../../src/common/enums/app.enums';

export const makeUser = (overrides: Partial<any> = {}) => ({
  id: 'user-1',
  fullName: 'Test User',
  email: 'test@example.com',
  phoneNumber: '1234567890',
  passwordHash: '$argon2id$hash',
  role: UserRole.Student,
  lastActivityAt: new Date(),
  createdAt: new Date(),
  updatedAt: null,
  isDeleted: false,
  deletedAt: null,
  ...overrides,
});

export const makeHostel = (overrides: Partial<any> = {}) => ({
  id: 'hostel-1',
  ownerId: 'user-1',
  name: 'Sample Hostel',
  isDeleted: false,
  isVerified: false,
  verifiedAt: null,
  verificationStatus: HostelVerificationStatus.None,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

export const makeSubscription = (overrides: Partial<any> = {}) => ({
  id: 'subscription-1',
  hostelId: 'hostel-1',
  isActive: true,
  isDeleted: false,
  startDate: new Date('2025-01-01T00:00:00.000Z'),
  expiryDate: new Date('2025-12-31T00:00:00.000Z'),
  lastReminderSentAt: null,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

export const makeVerificationRequest = (overrides: Partial<any> = {}) => ({
  id: 'verification-1',
  hostelId: 'hostel-1',
  requestedByUserId: 'user-1',
  status: HostelVerificationStatus.Pending,
  adminNotes: null,
  reviewedByAdminId: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

export const makeAmenity = (overrides: Partial<any> = {}) => ({
  id: 'amenity-1',
  name: 'WiFi',
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

export const makeHostelAmenityLink = (overrides: Partial<any> = {}) => ({
  hostelId: 'hostel-1',
  amenityId: 'amenity-1',
  ...overrides,
});

export const makeHostelListing = (overrides: Partial<any> = {}) => ({
  id: 'listing-1',
  hostelId: 'hostel-1',
  ownerUserId: 'user-1',
  status: 0,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  isDeleted: false,
  ...overrides,
});

export const makeUniversity = (overrides: Partial<any> = {}) => ({
  id: 'university-1',
  name: 'Test University',
  latitude: 6.9271,
  longitude: 79.8612,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});

export const makeRoom = (overrides: Partial<any> = {}) => ({
  id: 'room-1',
  hostelId: 'hostel-1',
  roomType: 'Single',
  price: 5000,
  capacity: 1,
  isAvailable: true,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});

export const makeInteractionEvent = (overrides: Partial<any> = {}) => ({
  id: 'event-1',
  userId: 'user-1',
  hostelId: 'hostel-1',
  eventType: 0,
  eventData: '{"action":"view"}',
  sessionId: 'session-1',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});

export const makeStudentPreference = (overrides: Partial<any> = {}) => ({
  userId: 'user-1',
  universityId: 'university-1',
  minBudget: 10000,
  maxBudget: 30000,
  requiredCapacity: 1,
  selectedAmenities: ['WiFi'],
  priorityOrder: ['price', 'distance', 'rating'],
  weights: {
    price: 0.4,
    distance: 0.3,
    rating: 0.3,
  },
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});

export const makeHostelReview = (overrides: Partial<any> = {}) => ({
  id: 'review-1',
  hostelId: 'hostel-1',
  userId: 'user-1',
  userFullName: 'Test User',
  rating: 4,
  comment: 'Good place',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});

export const makeHostelImage = (overrides: Partial<any> = {}) => ({
  id: 'image-1',
  hostelId: 'hostel-1',
  fileName: 'hostel-1.jpg',
  contentType: 'image/jpeg',
  fileSize: 1024,
  imageUrl: 'https://cdn.test/images/hostel-1.jpg',
  displayOrder: 1,
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: null,
  ...overrides,
});
