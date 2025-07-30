// Main exports for the dive-deco TypeScript library

// Core classes
export { Depth } from './depth';
export { Time } from './time';
export { Gas } from './gas';
export { OxTox } from './oxTox';

// Decompression model abstractions
export { DecoModel } from './decoModel';
export type { DiveState, DecoModelConfig } from './decoModel';

// Buhlmann ZH-L16C implementation
export { BuhlmannModel } from './buhlmannModel';
export { BuhlmannConfig, BuhlmannConfigBuilder } from './buhlmannConfig';
export { Compartment } from './compartment';
export type { Supersaturation } from './compartment';

// Type definitions and enums
export type {
    // Basic types
    Pressure,
    DepthType,
    GradientFactor,
    GradientFactors,
    MbarPressure,
    AscentRatePerMinute,
    Cns,
    Otu,

    // Interfaces
    PartialPressures,
    ConfigValidationError,
    DecoStage,
    DecoRuntime,
} from './types';

// ZH-L16C parameters type
export type { ZHLParams } from './zhlValues';

// Enums
export {
    NDLType,
    CeilingType,
    Units,
    DecoStageType,
    InertGas,

    // Error classes
    DecoCalculationError,
} from './types';

// ZH-L16C parameters data
export { ZHL_16C_N2_16A_HE_VALUES } from './zhlValues';

// Math utilities
export * as MathUtils from './mathUtils';
