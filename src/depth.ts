import { Units, DepthType } from './types';

export class Depth {
    private m: DepthType;

    constructor(meters: DepthType = 0) {
        this.m = meters;
    }

    static zero(): Depth {
        return new Depth(0);
    }

    static fromMeters(val: DepthType): Depth {
        return new Depth(val);
    }

    static fromFeet(val: DepthType): Depth {
        return new Depth(Depth.ftToM(val));
    }

    static fromUnits(val: DepthType, units: Units): Depth {
        switch (units) {
            case Units.Metric:
                return Depth.fromMeters(val);
            case Units.Imperial:
                return Depth.fromFeet(val);
        }
    }

    asMeters(): DepthType {
        return this.m;
    }

    asFeet(): DepthType {
        return Depth.mToFt(this.m);
    }

    toUnits(units: Units): DepthType {
        switch (units) {
            case Units.Metric:
                return this.asMeters();
            case Units.Imperial:
                return this.asFeet();
        }
    }

    baseUnit(): DepthType {
        return this.m;
    }

    add(other: Depth): Depth {
        return new Depth(this.m + other.m);
    }

    subtract(other: Depth): Depth {
        return new Depth(this.m - other.m);
    }

    multiply(other: Depth | number): Depth {
        if (typeof other === 'number') {
            return new Depth(this.m * other);
        }
        return new Depth(this.m * other.m);
    }

    divide(other: Depth | number): Depth {
        if (typeof other === 'number') {
            return new Depth(this.m / other);
        }
        return new Depth(this.m / other.m);
    }

    addAssign(other: Depth): void {
        this.m += other.m;
    }

    equals(other: Depth): boolean {
        return this.m === other.m;
    }

    lessThan(other: Depth): boolean {
        return this.m < other.m;
    }

    lessThanOrEqual(other: Depth): boolean {
        return this.m <= other.m;
    }

    greaterThan(other: Depth): boolean {
        return this.m > other.m;
    }

    greaterThanOrEqual(other: Depth): boolean {
        return this.m >= other.m;
    }

    toString(): string {
        return `${this.asMeters()}m / ${this.asFeet()}ft`;
    }

    private static mToFt(m: DepthType): DepthType {
        return m * 3.28084;
    }

    private static ftToM(ft: DepthType): DepthType {
        return ft * 0.3048;
    }
}
