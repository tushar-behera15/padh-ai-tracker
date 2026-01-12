export function buildRevisionDates(
    strategy: {
        revision_count: number;
        initial_gap: number;
        gap_multiplier: number;
    },
    deadline: string
): string[] {
    const today = new Date();
    const deadlineDate = new Date(deadline);

    let gap = strategy.initial_gap;
    let daysPassed = 0;
    const dates: string[] = [];

    for (let i = 0; i < strategy.revision_count; i++) {
        daysPassed += Math.ceil(gap);
        const d = new Date(today);
        d.setDate(today.getDate() + daysPassed);

        if (d > deadlineDate) break;

        dates.push(d.toISOString().split("T")[0]);
        gap *= strategy.gap_multiplier;
    }

    return dates;
}
