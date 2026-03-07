// 🔒 YUA SSOT — Review Queue Store (PHASE 5)
// 목적: Failure Candidate를 "심사 대기열"로만 관리

import { FailureCandidate } from "../phase-4/failure-candidate.model";
import { ReviewResult } from "./review-decision.types";

interface ReviewQueueItem {
  candidate: FailureCandidate;
  reviews: ReviewResult[];
}

const reviewQueue: Map<string, ReviewQueueItem> = new Map();

export const ReviewQueueStore = {
  enqueue(candidate: FailureCandidate): void {
    if (!reviewQueue.has(candidate.candidateId)) {
      reviewQueue.set(candidate.candidateId, {
        candidate,
        reviews: [],
      });
    }
  },

  addReview(result: ReviewResult): void {
    const item = reviewQueue.get(result.candidateId);
    if (!item) {
      throw new Error(
        `[SSOT] Candidate not found: ${result.candidateId}`
      );
    }
    item.reviews.push(result);
  },

  get(candidateId: string): ReviewQueueItem | undefined {
    return reviewQueue.get(candidateId);
  },

  list(): ReadonlyArray<ReviewQueueItem> {
    return Array.from(reviewQueue.values());
  },
};
