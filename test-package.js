const { BuhlmannConfig, BuhlmannModel, Gas, Depth, Time, CeilingType, NDLType } = require('./dist/index.js');

// Test the package exports
console.log('Testing dive-deco package...');

// Test builder pattern
const config = BuhlmannConfig.builder()
    .gradientFactors(30, 80)
    .surfacePressure(1020)
    .ceilingType(CeilingType.Adaptive)
    .ndlType(NDLType.ByCeiling)
    .build();

console.log('✓ Builder pattern works');
console.log('Config GF:', config.gradientFactors());

// Test model creation
const model = new BuhlmannModel(config);
console.log('✓ Model creation works');

// Test basic functionality
const air = Gas.air();
const depth = Depth.fromMeters(30);
const time = Time.fromMinutes(20);

console.log('✓ Basic classes work');
console.log('Air O2:', air.o2);
console.log('Depth:', depth.asMeters(), 'm');
console.log('Time:', time.asMinutes(), 'min');

console.log('📦 Package is ready for npm!');
