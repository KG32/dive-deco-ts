export class Time {
    private s: number;

    constructor(seconds: number = 0) {
        this.s = seconds;
    }

    static zero(): Time {
        return new Time(0);
    }

    static fromSeconds(val: number): Time {
        return new Time(val);
    }

    static fromMinutes(val: number): Time {
        return new Time(val * 60);
    }

    asSeconds(): number {
        return this.s;
    }

    asMinutes(): number {
        return this.s / 60;
    }

    add(other: Time): Time {
        return new Time(this.s + other.s);
    }

    subtract(other: Time): Time {
        return new Time(this.s - other.s);
    }

    multiply(other: Time | number): Time {
        if (typeof other === 'number') {
            return new Time(this.s * other);
        }
        return new Time(this.s * other.s);
    }

    divide(other: Time | number): Time {
        if (typeof other === 'number') {
            return new Time(this.s / other);
        }
        return new Time(this.s / other.s);
    }

    addAssign(other: Time): void {
        this.s += other.s;
    }

    equals(other: Time): boolean {
        return this.s === other.s;
    }

    lessThan(other: Time): boolean {
        return this.s < other.s;
    }

    lessThanOrEqual(other: Time): boolean {
        return this.s <= other.s;
    }

    greaterThan(other: Time): boolean {
        return this.s > other.s;
    }

    greaterThanOrEqual(other: Time): boolean {
        return this.s >= other.s;
    }

    toString(): string {
        return `${this.asMinutes().toFixed(1)}min`;
    }
}
