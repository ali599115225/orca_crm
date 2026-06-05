// lib/tours-config.ts

export interface ToursConfigType {
  minDataCompleteness: number;
  requireMedia: boolean;
  forceModalStatuses: string[];
}

export const TOURS_CONFIG: ToursConfigType = {
  minDataCompleteness: 0.8,
  requireMedia: true,
  forceModalStatuses: ['reserved', 'under_review'],
};
