export interface BillingCycleInput {
    transactionDate: string;
    cutoffDay: number;
    paymentDueDay: number;
    timeZone: 'Asia/Jakarta';
}
export declare function clampDay(year: number, monthIndex: number, day: number): string;
export declare function addBillingMonth(date: string, months: number): string;
export declare function calculateFirstDueDate(input: BillingCycleInput): string;
//# sourceMappingURL=billingCycle.d.ts.map