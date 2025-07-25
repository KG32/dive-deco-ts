import {
    AscentRatePerMinute,
    CeilingType,
    MbarPressure,
    ConfigValidationError,
    DecoRuntime,
    DecoCalculationError,
    GradientFactors,
    Cns,
    Otu,
} from './types';
import { Depth } from './depth';
import { Time } from './time';
import { Gas } from './gas';
import { OxTox } from './oxTox';

export interface DiveState {
    depth: Depth;
    time: Time;
    gas: Gas;
    oxTox: OxTox;
}

export interface DecoModelConfig {
    validate(): ConfigValidationError | null;
    surfacePressure(): MbarPressure;
    decoAscentRate(): AscentRatePerMinute;
    ceilingType(): CeilingType;
    roundCeiling(): boolean;
}

export abstract class DecoModel {
    abstract config(): DecoModelConfig;
    abstract diveState(): DiveState;

    // Record depth, time and gas
    abstract record(depth: Depth, time: Time, gas: Gas): void;

    // Record linear ascent/descent with travel time
    abstract recordTravel(targetDepth: Depth, time: Time, gas: Gas): void;

    // Record linear ascent/descent with rate
    abstract recordTravelWithRate(
        targetDepth: Depth,
        rate: AscentRatePerMinute,
        gas: Gas
    ): void;

    // Current no decompression limit
    abstract ndl(): Time;

    // Current decompression ceiling
    abstract ceiling(): Depth;

    // Decompression stages and time to surface
    abstract deco(gasMixes: Gas[]): DecoRuntime;

    // Central nervous system oxygen toxicity
    abstract cns(): Cns;

    // Pulmonary oxygen toxicity
    abstract otu(): Otu;

    // Check if in decompression obligation
    inDeco(): boolean {
        const ceilingType = this.config().ceilingType();
        switch (ceilingType) {
            case CeilingType.Actual:
                return this.ceiling().greaterThan(Depth.zero());
            case CeilingType.Adaptive:
                const currentGas = this.diveState().gas;
                const runtime = this.deco([currentGas]);
                return runtime.decoStages.length > 1;
        }
    }
}
