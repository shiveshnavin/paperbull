export class PerformanceRecorder {
    private records: Record<string, { start: number; end?: number; duration?: number }>;

    constructor() {
        this.records = {};
    }

    start(label: string): void {
        this.records[label] = { start: performance.now() };
    }

    stop(label: string): PerformanceRecorder {
        if (!this.records[label] || !this.records[label].start) {
            console.warn(`No start time recorded for label: ${label}`);
            return this;
        }
        this.records[label].end = performance.now();
        this.records[label].duration = this.records[label].end - this.records[label].start;
        return this
    }

    getDuration(label: string): number | null {
        if (!this.records[label] || typeof this.records[label].duration !== "number") {
            console.warn(`No recorded duration for label: ${label}`);
            return null;
        }
        return this.records[label].duration;
    }

    log(label: string): void {
        const duration = this.getDuration(label);
        if (duration !== null) {
            console.log(`Performance of ${label}: ${duration.toFixed(2)} ms`);
        }
    }
}
