import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/common/enums/app.enums.ts',
        'src/common/exceptions/app-exception.ts',
        'src/common/utils/prisma.util.ts',
        'src/auth/auth.service.ts',
        'src/config/app-config.service.ts',
        'src/users/users.service.ts',
        'src/amenities/amenities.service.ts',
        'src/interaction-events/interaction-events.service.ts',
        'src/rooms/rooms.service.ts',
        'src/student-preferences/student-preferences.service.ts',
        'src/universities/universities.service.ts',
        'src/hostels/hostels.service.ts',
        'src/hostels/listings/hostel-listings.service.ts',
        'src/hostels/reviews/hostel-reviews.service.ts',
        'src/hostels/verification/hostel-verification.service.ts',
        'src/hostels/subscriptions/hostel-subscriptions.service.ts',
        'src/hostels/subscriptions/subscription-monitor.service.ts',
        'src/hostels/amenities/hostel-amenities.service.ts',
        'src/hostels/images/hostel-images.service.ts',
        'src/hostels/images/local-image-storage.service.ts',
        'src/hostels/images/cleanup-deleted-data.service.ts',
      ],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/**/*.dto.ts',
        'src/**/*.interface.ts',
        'src/**/*.decorator.ts',
        'src/**/*.guard.ts',
        'src/**/*.strategy.ts',
        'src/**/*.middleware.ts',
        'src/**/*.filter.ts',
        'src/prisma/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
      reporter: ['text', 'lcov'],
    },
  },
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
});
