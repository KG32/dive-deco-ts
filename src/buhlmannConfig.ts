import {
    GradientFactors,
    MbarPressure,
    AscentRatePerMinute,
    CeilingType,
    NDLType,
    ConfigValidationError,
} from './types';
import { DecoModelConfig } from './decoModel';

export class BuhlmannConfig implements DecoModelConfig {
    private gfLow: number;
    private gfHigh: number;
    private surfacePressureValue: MbarPressure;
    private decoAscentRateValue: AscentRatePerMinute;
    private ceilingTypeValue: CeilingType;
    private roundCeilingValue: boolean;
    private ndlTypeValue: NDLType;

    constructor(
        gradientFactors: GradientFactors = [100, 100],
        surfacePressure: MbarPressure = 1013,
        decoAscentRate: AscentRatePerMinute = 10,
        ceilingType: CeilingType = CeilingType.Actual,
        roundCeiling: boolean = false,
        ndlType: NDLType = NDLType.Actual
    ) {
        this.gfLow = gradientFactors[0];
        this.gfHigh = gradientFactors[1];
        this.surfacePressureValue = surfacePressure;
        this.decoAscentRateValue = decoAscentRate;
        this.ceilingTypeValue = ceilingType;
        this.roundCeilingValue = roundCeiling;
        this.ndlTypeValue = ndlType;
    }

    static default(): BuhlmannConfig {
        return new BuhlmannConfig();
    }

    validate(): ConfigValidationError | null {
        if (this.gfLow < 1 || this.gfLow > 100) {
            return {
                field: 'gfLow',
                reason: 'GF Low must be between 1 and 100',
            };
        }

        if (this.gfHigh < 1 || this.gfHigh > 100) {
            return {
                field: 'gfHigh',
                reason: 'GF High must be between 1 and 100',
            };
        }

        if (this.gfLow > this.gfHigh) {
            return {
                field: 'gradientFactors',
                reason: 'GF Low must be less than or equal to GF High',
            };
        }

        if (
            this.surfacePressureValue < 500 ||
            this.surfacePressureValue > 1200
        ) {
            return {
                field: 'surfacePressure',
                reason: 'Surface pressure must be between 500 and 1200 mbar',
            };
        }

        if (this.decoAscentRateValue <= 0 || this.decoAscentRateValue > 30) {
            return {
                field: 'decoAscentRate',
                reason: 'Deco ascent rate must be between 0 and 30 m/min',
            };
        }

        return null;
    }

    surfacePressure(): MbarPressure {
        return this.surfacePressureValue;
    }

    decoAscentRate(): AscentRatePerMinute {
        return this.decoAscentRateValue;
    }

    ceilingType(): CeilingType {
        return this.ceilingTypeValue;
    }

    roundCeiling(): boolean {
        return this.roundCeilingValue;
    }

    gradientFactors(): GradientFactors {
        return [this.gfLow, this.gfHigh];
    }

    ndlType(): NDLType {
        return this.ndlTypeValue;
    }

    // Setters for configuration changes
    setGradientFactors(gfLow: number, gfHigh: number): void {
        this.gfLow = gfLow;
        this.gfHigh = gfHigh;
    }

    setSurfacePressure(pressure: MbarPressure): void {
        this.surfacePressureValue = pressure;
    }

    setDecoAscentRate(rate: AscentRatePerMinute): void {
        this.decoAscentRateValue = rate;
    }

    setCeilingType(type: CeilingType): void {
        this.ceilingTypeValue = type;
    }

    setRoundCeiling(round: boolean): void {
        this.roundCeilingValue = round;
    }

    setNdlType(type: NDLType): void {
        this.ndlTypeValue = type;
    }

    clone(): BuhlmannConfig {
        return new BuhlmannConfig(
            [this.gfLow, this.gfHigh],
            this.surfacePressureValue,
            this.decoAscentRateValue,
            this.ceilingTypeValue,
            this.roundCeilingValue,
            this.ndlTypeValue
        );
    }
}
