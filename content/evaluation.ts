import type { Activity } from './types.ts';

export type ActivityResponse = string | boolean | string[] | Record<string, string> | number;

export function isActivityCorrect(activity: Activity, response: ActivityResponse): boolean {
  if (activity.activityType === 'multiple-choice') return response === activity.answer;
  if (activity.activityType === 'true-false') return response === activity.answer;
  if (activity.activityType === 'ordering') {
    return Array.isArray(response) && response.join('|') === activity.correctOrder.join('|');
  }
  if (activity.activityType === 'matching') {
    if (!response || Array.isArray(response) || typeof response !== 'object') return false;
    return activity.pairs.every((pair) => response[pair.left] === pair.right);
  }
  const value = typeof response === 'number' ? response : Number(response);
  const tolerance = activity.tolerance ?? 0.000001;
  return response !== '' && Number.isFinite(value) && Math.abs(value - activity.answer) <= tolerance;
}

export function correctResponseFor(activity: Activity): ActivityResponse {
  if (activity.activityType === 'multiple-choice' || activity.activityType === 'true-false' || activity.activityType === 'numeric') return activity.answer;
  if (activity.activityType === 'ordering') return activity.correctOrder;
  return Object.fromEntries(activity.pairs.map((pair) => [pair.left, pair.right]));
}
