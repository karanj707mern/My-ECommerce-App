// Nestia SDK - Auto-generated from backend controllers
// This file will be overwritten by `nx run nestia-sdk:generate`
// DO NOT EDIT MANUALLY

export * from './api/modules';
export * from './api/structures';

// Re-export shared types for convenience
export * from '@moringa/shared';

// Runtime API client configuration
export const API_BASE_URL = typeof window !== 'undefined'
  ? (() => {
      const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
      if (explicit) return explicit;
      if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
        return 'http://localhost:5000/api/v1';
      }
      return `${window.location.origin}/api/v1`;
    })()
  : 'http://localhost:5000/api/v1';

export const API_TIMEOUT = 15000;
