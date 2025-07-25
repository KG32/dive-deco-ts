// Global types for the dive decompression library

import { Depth } from './depth';
import { Gas } from './gas';
import { Time } from './time';

export type Pressure = number;
export type DepthType = number;
export type GradientFactor = number;
export type GradientFactors = [number, number];
export type MbarPressure = number;
export type AscentRatePerMinute = number;
export type Cns = number;
export type Otu = number;

export enum NDLType {
    Actual = 'Actual', // take into consideration off-gassing during ascent
    ByCeiling = 'ByCeiling', // treat NDL as a point when ceiling > 0
}

export enum CeilingType {
    Actual = 'Actual',
    Adaptive = 'Adaptive',
}

export enum Units {
    Metric = 'Metric',
    Imperial = 'Imperial',
}

export enum DecoStageType {
    Ascent = 'Ascent',
    DecoStop = 'DecoStop',
    GasSwitch = 'GasSwitch',
}

export enum InertGas {
    Helium = 'Helium',
    Nitrogen = 'Nitrogen',
}

export interface PartialPressures {
    o2: Pressure;
    n2: Pressure;
    he: Pressure;
}

export interface ConfigValidationError {
    field: string;
    reason: string;
}

export interface DecoStage {
    stageType: DecoStageType;
    startDepth: Depth;
    endDepth: Depth;
    duration: Time;
    gas: Gas;
}

export interface DecoRuntime {
    decoStages: DecoStage[];
    tts: Time;
    ttsSurface: Time;
    sim: boolean;
}

export class DecoCalculationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DecoCalculationError';
    }
}
