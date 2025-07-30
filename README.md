# Dive Deco

A comprehensive TypeScript implementation of decompression calculation algorithms for scuba diving, featuring the industry-standard Bühlmann ZH-L16C algorithm with gradient factors.

[![Build Status](https://github.com/KG32/dive-deco-ts/workflows/CI/badge.svg)](https://github.com/KG32/dive-deco-ts/actions)
[![Tests](https://img.shields.io/github/actions/workflow/status/KG32/dive-deco-ts/ci.yml?branch=main&label=tests)](https://github.com/KG32/dive-deco-ts/actions)
[![npm version](https://img.shields.io/badge/npm-v0.0.1-blue)](https://www.npmjs.com/package/dive-deco)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](#license)

## Features

### 🔬 Bühlmann ZH-L16C Algorithm

- **16 tissue compartments** with nitrogen and helium tracking
- **Gradient Factors (GF)** for conservative decompression profiles
- **No Decompression Limit (NDL)** calculations with multiple algorithms
- **Ceiling** depth calculations with real-time monitoring
- **Decompression schedules** with optimized stops and timing
- **Time to Surface (TTS)** calculations

### ⚗️ Advanced Gas Management

- **Mixed gas support**: Air, Nitrox, Trimix with full validation
- **Partial pressure calculations** at depth with safety limits
- **Maximum Operating Depth (MOD)** calculations
- **Equivalent Narcotic Depth (END)** for trimix diving
- **Multi-gas decompression** with automatic gas switching

### 📊 Tissue Loading Analysis

- **Supersaturation monitoring** (GF99, GFSurf)
- **Individual compartment analysis** with detailed pressure tracking
- **Mixed gas coefficients** for helium/nitrogen calculations
- **Real-time gradient factor tracking**

### 🫁 Oxygen Toxicity Tracking

- **CNS (Central Nervous System)** oxygen toxicity monitoring
- **OTU (Oxygen Tolerance Units)** pulmonary toxicity calculations
- **Real-time exposure tracking** with safety thresholds
- **Integrated safety warnings** and limits

## Installation

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Format code
npm run format
```

### Package Installation

```bash
npm install dive-deco
```

## Quick Start

```typescript
import { BuhlmannModel, Gas, Depth, Time } from 'dive-deco';

// Create model with default settings (GF 100/100)
const model = BuhlmannModel.default();
const air = Gas.air();

// Simulate dive to 30m for 25 minutes
model.recordTravel(Depth.fromMeters(30), Time.fromMinutes(3), air);
model.record(Depth.fromMeters(30), Time.fromMinutes(25), air);

// Check decompression status
console.log(`NDL remaining: ${model.ndl().asMinutes()}min`);
console.log(`Ceiling: ${model.ceiling().asMeters()}m`);
console.log(`In deco: ${model.inDeco()}`);
```

## Usage

### Configuration Options

```typescript
import {
    BuhlmannConfig,
    BuhlmannConfigBuilder,
    CeilingType,
    NDLType,
} from 'dive-deco';

// Method 1: Builder pattern (recommended) with full configuration
const config2 = new BuhlmannConfigBuilder()
    .gradientFactors(20, 75) // Conservative GF
    .surfacePressure(1013) // Sea level pressure
    .decoAscentRate(9) // Slow ascent rate
    .ceilingType(CeilingType.Adaptive)
    .roundCeiling(false) // Precise ceiling depths
    .ndlType(NDLType.Actual) // Account for off-gassing
    .build();

// Method 2: Direct configuration with all options
const config = new BuhlmannConfig(
    [30, 85], // GF Low/High 30/85
    1013, // Surface pressure (mbar)
    9, // Ascent rate (m/min)
    CeilingType.Adaptive, // Ceiling calculation type
    true, // Round ceiling to nearest meter
    NDLType.ByCeiling // NDL calculation strategy
);

// Method 3: Default configuration
const defaultConfig = BuhlmannConfig.default(); // GF 100/100, standard settings

// Validation
const validationError = config.validate();
if (validationError) {
    console.error(
        `Configuration error in ${validationError.field}: ${validationError.reason}`
    );
}

const model = new BuhlmannModel(config);
```

### Gas Mix Operations

```typescript
import { Gas } from 'dive-deco';

// Standard gas mixes
const air = Gas.air(); // 21% O2, 0% He
const nitrox32 = new Gas(0.32, 0); // EAN32: 32% O2, 0% He
const trimix2135 = new Gas(0.21, 0.35); // TMX 21/35: 21% O2, 35% He

// Safety calculations
const mod = nitrox32.maxOperatingDepth(1.4); // MOD at 1.4 ATA ppO2
const end = trimix2135.equivalentNarcoticDepth(Depth.fromMeters(45));

console.log(`EAN32 MOD: ${mod.asMeters()}m`);
console.log(`Trimix END: ${end.asMeters()}m`);

// Validate gas mix
console.log(`Valid mix: ${trimix2135.isValid()}`);
```

### Comprehensive Dive Planning

```typescript
// Multi-gas decompression with gas switching
const decoGases = [air, nitrox32, new Gas(1.0, 0)]; // Air, EAN32, O2
const decoRuntime = model.deco(decoGases);

console.log(`Total Time to Surface: ${decoRuntime.tts.asMinutes()}min`);

// Detailed decompression schedule
decoRuntime.decoStages.forEach((stage, index) => {
    console.log(`Stage ${index + 1}: ${stage.stageType}`);
    console.log(
        `  ${stage.startDepth.asMeters()}m → ${stage.endDepth.asMeters()}m`
    );
    console.log(
        `  Duration: ${stage.duration.asMinutes()}min on ${stage.gas.toString()}`
    );
});

// NDL calculations with different strategies
const adaptiveNDL = model.ndl(); // Adaptive algorithm
const conservativeNDL = model.ndl(NDLType.Conservative);
```

### Oxygen Toxicity Monitoring

```typescript
import { OxTox } from 'dive-deco';

// Create OxTox tracker
const oxTox = OxTox.default(); // Start with zero exposure

// Manual exposure tracking
const ppO2 = 1.4; // 1.4 ATA partial pressure
const exposureTime = Time.fromMinutes(30); // 30 minutes exposure

oxTox.addExposure(ppO2, exposureTime);

console.log(`CNS: ${oxTox.cns.toFixed(1)}%`);
console.log(`OTU: ${oxTox.otu.toFixed(1)}`);

// Integrated with BuhlmannModel (automatic tracking)
const cns = model.cns(); // Current CNS from all dive segments
const otu = model.otu(); // Current OTU from all dive segments

// Safety thresholds
if (cns > 80) {
    console.warn('CNS approaching dangerous levels (>80%)');
}

if (otu > 300) {
    console.warn('OTU exposure high (>300 units)');
}

// Clone for scenario planning
const futureOxTox = oxTox.clone();
futureOxTox.addExposure(1.6, Time.fromMinutes(20)); // Test future exposure
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

#### `BuhlmannModel`

Main decompression model implementation with ZH-L16C algorithm.

**Key Methods:**

- `record(depth, time, gas)` - Record dive segment
- `recordTravel(depth, time, gas)` - Record ascent/descent with travel time
- `ndl(type?)` - Calculate No Decompression Limit
- `ceiling(type?)` - Current ceiling depth
- `deco(gases)` - Full decompression schedule with gas switching
- `inDeco()` - Check if decompression is required
- `cns()` - Current CNS oxygen toxicity percentage
- `otu()` - Current OTU oxygen toxicity units
- `tissurePressures()` - Individual compartment pressures
- `supersaturation()` - GF99/GFSurf for all compartments

#### `BuhlmannConfig` & `BuhlmannConfigBuilder`

Model configuration with validation and builder pattern support.

**Constructor Options:**

- `gradientFactors: GradientFactors` - GF Low/High values [1-100, 1-100] (default: [100, 100])
- `surfacePressure: MbarPressure` - Surface pressure in mbar [500-1200] (default: 1013)
- `decoAscentRate: AscentRatePerMinute` - Ascent rate in m/min [0-30] (default: 10)
- `ceilingType: CeilingType` - Ceiling calculation type (default: CeilingType.Actual)
- `roundCeiling: boolean` - Round ceiling to nearest meter (default: false)
- `ndlType: NDLType` - NDL calculation strategy (default: NDLType.Actual)

**Configuration Enums:**

```typescript
enum CeilingType {
    Actual = 'Actual', // Standard ceiling calculation
    Adaptive = 'Adaptive', // Adaptive ceiling algorithm
}

enum NDLType {
    Actual = 'Actual', // Consider off-gassing during ascent
    ByCeiling = 'ByCeiling', // NDL when ceiling > 0
}
```

**Builder Methods:**

- `gradientFactors(low, high)` - Set gradient factors
- `surfacePressure(pressure)` - Set surface pressure (mbar)
- `decoAscentRate(rate)` - Set ascent rate (m/min)
- `ceilingType(type)` - Set ceiling calculation type
- `roundCeiling(round)` - Enable/disable ceiling rounding
- `ndlType(type)` - Set NDL calculation strategy
- `build()` - Create validated configuration
- `validate()` - Validate current configuration

**Static Methods:**

- `BuhlmannConfig.default()` - Default configuration
- `BuhlmannConfig.builder()` - Create new builder instance

#### `Gas`

Gas mix handling with safety calculations.

**Methods:**

- `Gas.air()` - Standard air (21% O2)
- `maxOperatingDepth(ppO2)` - MOD calculation
- `equivalentNarcoticDepth(depth)` - END calculation

#### `Depth` & `Time`

Unit handling with conversion utilities.

**Features:**

- Metric/Imperial conversions
- Arithmetic operations
- Type-safe depth/time calculations

#### `OxTox`

Oxygen toxicity tracking for CNS and OTU calculations using NOAA standards.

**Properties:**

- `cns: Cns` - Current CNS oxygen toxicity percentage
- `otu: Otu` - Current OTU (Oxygen Tolerance Units)

**Methods:**

- `addExposure(ppO2, time)` - Add oxygen exposure for given partial pressure and time
- `clone()` - Create a copy of the current OxTox state

**Static Methods:**

- `OxTox.default()` - Create new instance with zero exposure

**CNS Calculation:**

Uses NOAA CNS coefficient table for accurate CNS tracking:

- PO2 0.5-0.6 ATA: Linear rate calculation
- PO2 0.6-1.65 ATA: Progressively increasing rates
- PO2 > 1.65 ATA: Maximum rate (dangerous levels)

**OTU Calculation:**

Formula: `OTU = (ppO2 - 0.5 / 0.5)^0.83 * time_minutes`

- Only accumulates when ppO2 > 0.5 ATA
- Tracks pulmonary oxygen toxicity over time

## Algorithm Implementation

This library implements the **Bühlmann ZH-L16C** decompression algorithm with the following specifications:

### Technical Details

- **16 tissue compartments** with distinct nitrogen and helium half-times
- **Gradient factors (GF)** for adjustable conservatism (20-100% range)
- **Mixed gas calculations** supporting Air, Nitrox, and Trimix
- **Haldane equation** for accurate gas loading and off-loading
- **M-value calculations** with gradient factor adjustments
- **Real-time ceiling and TTS computation assuming off-gassing on ascent** with configurable ascent rates

## Testing & Validation

```bash
npm test
```

### Validation & Accuracy

- Algorithm follows established ZH-L16C parameters
- Test suite validates against known decompression scenarios
- Calculations verified for typical recreational and technical diving profiles

## Contributing

We welcome contributions! Areas where help is needed:

- Additional test cases and validation scenarios
- Performance optimizations
- Extended algorithm implementations
- Documentation improvements
- Real-world dive profile testing

## Safety Notice

⚠️ **IMPORTANT SAFETY DISCLAIMER**

**This software is for educational, research, and development purposes only.**

- **DO NOT use for actual dive planning** without proper validation and certification
- **Always use certified dive computers** and follow established decompression procedures
- **Consult qualified diving professionals** for dive planning and safety
- **Verify all calculations** against established decompression tables
- **Understand diving risks** and maintain proper certification and training

The developers assume no responsibility for diving safety or accuracy of calculations when used for actual diving activities.

## License

This implementation provides decompression calculation algorithms adapted for TypeScript/JavaScript environments.
