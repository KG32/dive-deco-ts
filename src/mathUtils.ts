// Math utility functions for decompression calculations

export function round(value: number): number {
    return Math.round(value);
}

export function ceil(value: number): number {
    return Math.ceil(value);
}

export function floor(value: number): number {
    return Math.floor(value);
}

export function abs(value: number): number {
    return Math.abs(value);
}

export function min(a: number, b: number): number {
    return Math.min(a, b);
}

export function max(a: number, b: number): number {
    return Math.max(a, b);
}

export function exp(value: number): number {
    return Math.exp(value);
}

export function ln(value: number): number {
    return Math.log(value);
}

export function log10(value: number): number {
    return Math.log10(value);
}

export function pow(base: number, exponent: number): number {
    return Math.pow(base, exponent);
}

export function sqrt(value: number): number {
    return Math.sqrt(value);
}

// Linear interpolation
export function lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
}

// Clamp value between min and max
export function clamp(value: number, minVal: number, maxVal: number): number {
    return Math.min(Math.max(value, minVal), maxVal);
}

// Convert pressure to depth (in meters, assuming seawater)
export function pressureToDepth(
    pressure: number,
    surfacePressure: number = 1.013
): number {
    return (pressure - surfacePressure) * 10.33;
}

// Convert depth to pressure (in bar, assuming seawater)
export function depthToPressure(
    depth: number,
    surfacePressure: number = 1.013
): number {
    return surfacePressure + depth / 10.33;
}
