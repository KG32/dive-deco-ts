import { BuhlmannModel, Gas, Depth, Time, BuhlmannConfig } from './src/index';

// Example: Simulate a dive profile and calculate decompression
console.log('=== Dive Decompression Library Example ===\n');

// Create a Buhlmann model with custom gradient factors
const config = new BuhlmannConfig([30, 85], 1013, 9);
const model = new BuhlmannModel(config);

// Create gas mixes
const air = Gas.air();
const nitrox32 = new Gas(0.32, 0); // EAN32
const oxygen = new Gas(1.0, 0); // Pure O2 for deco

console.log('Gas mixes:');
console.log(`- Air: ${air.toString()}`);
console.log(`- Nitrox 32: ${nitrox32.toString()}`);
console.log(`- Oxygen: ${oxygen.toString()}\n`);

// Simulate descent to 30m
console.log('--- Dive Profile ---');
console.log('Descending to 30m...');
model.recordTravel(Depth.fromMeters(30), Time.fromMinutes(3), air);

console.log(`Depth: ${model.diveState().depth.asMeters()}m`);
console.log(`Time: ${model.diveState().time.asMinutes()}min`);
console.log(`NDL at 30m: ${model.ndl().asMinutes()}min`);
console.log(`Ceiling: ${model.ceiling().asMeters()}m\n`);

// Bottom time at 30m for 25 minutes
console.log('Bottom time: 25 minutes at 30m');
model.record(Depth.fromMeters(30), Time.fromMinutes(25), air);

console.log(`Total time: ${model.diveState().time.asMinutes()}min`);
console.log(`NDL remaining: ${model.ndl().asMinutes()}min`);
console.log(`Ceiling: ${model.ceiling().asMeters()}m`);
console.log(`In deco: ${model.inDeco()}\n`);

// Calculate decompression schedule
const decoRuntime = model.deco([air, nitrox32, oxygen]);
console.log('--- Decompression Schedule ---');
console.log(
    `Total Time to Surface: ${decoRuntime.tts.asMinutes().toFixed(1)}min\n`
);

decoRuntime.decoStages.forEach((stage, index) => {
    console.log(`Stage ${index + 1}: ${stage.stageType}`);
    console.log(
        `  From ${stage.startDepth.asMeters()}m to ${stage.endDepth.asMeters()}m`
    );
    console.log(`  Duration: ${stage.duration.asMinutes().toFixed(1)}min`);
    console.log(`  Gas: ${stage.gas.toString()}\n`);
});

// Check oxygen toxicity
console.log('--- Oxygen Toxicity ---');
console.log(`CNS: ${model.cns().toFixed(1)}%`);
console.log(`OTU: ${model.otu().toFixed(1)}\n`);

// Check tissue loading
console.log('--- Tissue Loading (First 5 Compartments) ---');
const tissueLoading = model.tissurePressures();
const supersaturation = model.supersaturation();

tissueLoading.slice(0, 5).forEach((tissue, i) => {
    const ss = supersaturation[i];
    console.log(`Compartment ${i + 1}:`);
    console.log(
        `  N2: ${tissue.n2.toFixed(3)} bar, He: ${tissue.he.toFixed(3)} bar`
    );
    console.log(
        `  GF99: ${ss.gf99.toFixed(1)}%, GFSurf: ${ss.gfSurf.toFixed(1)}%`
    );
});

console.log('\n=== Example Complete ===');
