# Dive Deco TypeScript

A TypeScript implementation of decompression calculation algorithms for scuba diving.

## Features

### Bühlmann ZH-L16C Algorithm

- **16 tissue compartments** with nitrogen and helium tracking
- **Gradient Factors (GF)** for conservative decompression profiles
- **No Decompression Limit (NDL)** calculations
- **Ceiling** depth calculations
- **Decompression schedules** with required stops and times
- **Time to Surface (TTS)** calculations

### Gas Management

- **Mixed gas support**: Air, Nitrox, Trimix
- **Partial pressure calculations** at depth
- **Maximum Operating Depth (MOD)** calculations
- **Equivalent Narcotic Depth (END)** for trimix

### Oxygen Toxicity Tracking

- **CNS (Central Nervous System)** oxygen toxicity
- **OTU (Oxygen Tolerance Units)** pulmonary toxicity
- **Real-time exposure calculations**

### Tissue Loading Analysis

- **Supersaturation monitoring** (GF99, GFSurf)
- **Individual compartment analysis**
- **Mixed gas coefficients** for helium/nitrogen

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Dive Simulation

```typescript
import { BuhlmannModel, Gas, Depth, Time } from './src/index';

// Create model with default settings (GF 30/85)
const model = BuhlmannModel.default();
const air = Gas.air();

// Simulate dive to 30m for 25 minutes
model.recordTravel(Depth.fromMeters(30), Time.fromMinutes(3), air); // Descent
model.record(Depth.fromMeters(30), Time.fromMinutes(25), air); // Bottom time

// Check decompression status
console.log(`NDL remaining: ${model.ndl().asMinutes()}min`);
console.log(`Ceiling: ${model.ceiling().asMeters()}m`);
console.log(`In deco: ${model.inDeco()}`);
```

### Custom Configuration

```typescript
import { BuhlmannConfig, BuhlmannModel } from './src/index';

// Conservative gradient factors, custom surface pressure
const config = new BuhlmannConfig(
    [20, 75], // GF Low/High
    1013, // Surface pressure (mbar)
    9 // Ascent rate (m/min)
);

const model = new BuhlmannModel(config);
```

### Gas Mixes

```typescript
import { Gas } from './src/index';

const air = Gas.air(); // 21% O2, 0% He
const nitrox32 = new Gas(0.32, 0); // EAN32: 32% O2, 0% He
const trimix2135 = new Gas(0.21, 0.35); // TMX 21/35: 21% O2, 35% He

// Calculate MOD for 1.4 ATA ppO2
const mod = nitrox32.maxOperatingDepth(1.4);
console.log(`EAN32 MOD: ${mod.asMeters()}m`);
```

### Decompression Planning

```typescript
// Calculate full decompression schedule
const decoRuntime = model.deco([air, nitrox32]);

console.log(`Time to Surface: ${decoRuntime.tts.asMinutes()}min`);

decoRuntime.decoStages.forEach(stage => {
    console.log(
        `${stage.stageType}: ${stage.startDepth.asMeters()}m → ${stage.endDepth.asMeters()}m`
    );
    console.log(
        `Duration: ${stage.duration.asMinutes()}min on ${stage.gas.toString()}`
    );
});
```

### Oxygen Toxicity Monitoring

```typescript
// Check current exposure levels
const cns = model.cns(); // CNS percentage
const otu = model.otu(); // OTU units

console.log(`CNS: ${cns.toFixed(1)}%`);
console.log(`OTU: ${otu.toFixed(1)}`);
```

### Tissue Analysis

```typescript
// Get detailed tissue information
const tissueData = model.tissurePressures();
const supersaturation = model.supersaturation();

tissueData.forEach((tissue, i) => {
    const ss = supersaturation[i];
    console.log(`Compartment ${i + 1}:`);
    console.log(`  N2: ${tissue.n2.toFixed(3)} bar`);
    console.log(`  GF99: ${ss.gf99.toFixed(1)}%`);
});
```

## API Reference

### Core Classes

- **`BuhlmannModel`** - Main decompression model implementation
- **`BuhlmannConfig`** - Model configuration (GF, surface pressure, etc.)
- **`Gas`** - Gas mix with O2/He fractions and calculations
- **`Depth`** - Depth handling with metric/imperial conversion
- **`Time`** - Time calculations in seconds/minutes
- **`OxTox`** - Oxygen toxicity tracking

### Key Methods

- **`model.record(depth, time, gas)`** - Record dive segment
- **`model.ndl()`** - No decompression limit
- **`model.ceiling()`** - Current ceiling depth
- **`model.deco(gases)`** - Full decompression schedule
- **`model.inDeco()`** - Check if decompression required

## Algorithm Details

This implementation follows the Bühlmann ZH-L16C decompression algorithm:

- **16 tissue compartments** with different nitrogen/helium half-times
- **Gradient factors** for adjustable conservatism
- **Mixed gas calculations** for trimix diving
- **Haldane equation** for gas loading/off-loading
- **M-value calculations** with GF adjustments

The algorithm is widely used in commercial dive computers and decompression software.

## Testing

```bash
npm test
```

The test suite covers:

- Gas mix calculations and validation
- Depth/time conversions
- Basic decompression calculations
- NDL and ceiling calculations
- Model configuration validation

## Example Output

See `example.ts` for a complete dive simulation showing:

- Descent and bottom time
- NDL tracking
- Decompression schedule calculation
- Oxygen toxicity monitoring
- Tissue loading analysis

## Limitations

- **Simplified decompression calculation** - Current implementation provides basic deco scheduling
- **No gas switching optimization** - Uses provided gas list in order
- **Conservative NDL simulation** - Uses iterative approach rather than analytical solution
- **Limited validation** - Calculations should be verified against established tables

## Safety Notice

⚠️ **This software is for educational and research purposes only. Do not use for actual dive planning without proper validation and testing. Always use certified dive computers and follow proper decompression procedures.**

## License

This implementation provides decompression calculation algorithms adapted for TypeScript/JavaScript environments.
