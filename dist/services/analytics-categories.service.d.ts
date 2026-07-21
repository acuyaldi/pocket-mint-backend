import type { AnalyticsCategoryBreakdownInput, AnalyticsCategoryBreakdownResult, AnalyticsPrismaClient } from './analytics-query.types';
export declare function createAnalyticsCategoriesService(db: AnalyticsPrismaClient): {
    getCategoryBreakdown: (input: AnalyticsCategoryBreakdownInput) => Promise<AnalyticsCategoryBreakdownResult>;
};
/** Production instance bound to the shared Prisma singleton. */
export declare const analyticsCategoriesService: {
    getCategoryBreakdown: (input: AnalyticsCategoryBreakdownInput) => Promise<AnalyticsCategoryBreakdownResult>;
};
//# sourceMappingURL=analytics-categories.service.d.ts.map