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
    private readonly gfLow: number;
    private readonly gfHigh: number;
    private readonly surfacePressureValue: MbarPressure;
    private readonly decoAscentRateValue: AscentRatePerMinute;
    private readonly ceilingTypeValue: CeilingType;
    private readonly roundCeilingValue: boolean;
    private readonly ndlTypeValue: NDLType;

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

    static builder(): BuhlmannConfigBuilder {
        return new BuhlmannConfigBuilder();
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

export class BuhlmannConfigBuilder {
    private gfLow: number = 100;
    private gfHigh: number = 100;
    private surfacePressureValue: MbarPressure = 1013;
    private decoAscentRateValue: AscentRatePerMinute = 10;
    private ceilingTypeValue: CeilingType = CeilingType.Actual;
    private roundCeilingValue: boolean = false;
    private ndlTypeValue: NDLType = NDLType.Actual;

    gradientFactors(gfLow: number, gfHigh: number): BuhlmannConfigBuilder {
        this.gfLow = gfLow;
        this.gfHigh = gfHigh;
        return this;
    }

    surfacePressure(pressure: MbarPressure): BuhlmannConfigBuilder {
        this.surfacePressureValue = pressure;
        return this;
    }

    decoAscentRate(rate: AscentRatePerMinute): BuhlmannConfigBuilder {
        this.decoAscentRateValue = rate;
        return this;
    }

    ceilingType(type: CeilingType): BuhlmannConfigBuilder {
        this.ceilingTypeValue = type;
        return this;
    }

    roundCeiling(round: boolean): BuhlmannConfigBuilder {
        this.roundCeilingValue = round;
        return this;
    }

    ndlType(type: NDLType): BuhlmannConfigBuilder {
        this.ndlTypeValue = type;
        return this;
    }

    build(): BuhlmannConfig {
        const config = new BuhlmannConfig(
            [this.gfLow, this.gfHigh],
            this.surfacePressureValue,
            this.decoAscentRateValue,
            this.ceilingTypeValue,
            this.roundCeilingValue,
            this.ndlTypeValue
        );

        // Validate the configuration before returning
        const error = config.validate();
        if (error) {
            throw new Error(`Invalid configuration: ${error.reason}`);
        }

        return config;
    }
}
