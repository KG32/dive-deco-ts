import { BuhlmannConfig } from './src/buhlmannConfig';
import { CeilingType, NDLType } from './src/types';

// Example usage of the Builder Pattern

// Using default configuration
const defaultConfig = BuhlmannConfig.default();

// Using the builder pattern with method chaining
const customConfig = BuhlmannConfig.builder()
    .gradientFactors(30, 80)
    .surfacePressure(1020)
    .decoAscentRate(9)
    .ceilingType(CeilingType.Adaptive)
    .roundCeiling(true)
    .ndlType(NDLType.ByCeiling)
    .build();

// Building configuration step by step
const builder = BuhlmannConfig.builder();
builder.gradientFactors(35, 85);
builder.surfacePressure(1000);
const stepByStepConfig = builder.build();

// Configuration will throw an error if invalid
try {
    const invalidConfig = BuhlmannConfig.builder()
        .gradientFactors(150, 200) // Invalid - GF values > 100
        .build();
} catch (error) {
    console.log('Caught validation error:', error.message);
}

console.log('Default config GF:', defaultConfig.gradientFactors());
console.log('Custom config GF:', customConfig.gradientFactors());
console.log('Step-by-step config GF:', stepByStepConfig.gradientFactors());
