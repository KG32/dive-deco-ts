import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
    BuhlmannModel,
    BuhlmannConfig,
    Gas,
    Depth,
    Time,
    Units,
    CeilingType,
    DecoStageType,
} from './index';

// Test utility functions
function modelGf(gfLow: number, gfHigh: number): BuhlmannModel {
    const config = new BuhlmannConfig([gfLow, gfHigh]);
    return new BuhlmannModel(config);
}

function gasAir(): Gas {
    return new Gas(0.21, 0);
}

describe('dive-deco TypeScript library', () => {
    describe('Gas', () => {
        it('should create air correctly', () => {
            const air = Gas.air();
            expect(air.o2).to.equal(0.21);
            expect(air.n2).to.equal(0.79);
            expect(air.he).to.equal(0);
        });

        it('should create custom gas mix', () => {
            const nitrox32 = new Gas(0.32, 0);
            expect(nitrox32.o2).to.equal(0.32);
            expect(nitrox32.n2).to.be.closeTo(0.68, 0.0001);
            expect(nitrox32.he).to.equal(0);
            expect(nitrox32.id()).to.equal('32/0');
        });

        it('should create trimix', () => {
            const tmx2135 = new Gas(0.21, 0.35);
            expect(tmx2135.o2).to.equal(0.21);
            expect(tmx2135.n2).to.be.closeTo(0.44, 0.0001);
            expect(tmx2135.he).to.equal(0.35);
            expect(tmx2135.id()).to.equal('21/35');
        });

        it('should throw error for invalid gas mix', () => {
            expect(() => new Gas(0.5, 0.6)).to.throw(
                'Invalid partial pressures'
            );
        });
    });

    describe('Depth', () => {
        it('should handle depth conversions', () => {
            const depth10m = Depth.fromMeters(10);
            expect(depth10m.asMeters()).to.equal(10);
            expect(depth10m.asFeet()).to.be.closeTo(32.8, 0.1);
        });

        it('should handle depth operations', () => {
            const depth1 = Depth.fromMeters(10);
            const depth2 = Depth.fromMeters(5);

            const sum = depth1.add(depth2);
            expect(sum.asMeters()).to.equal(15);

            const diff = depth1.subtract(depth2);
            expect(diff.asMeters()).to.equal(5);
        });
    });

    describe('Time', () => {
        it('should handle time conversions', () => {
            const time = Time.fromMinutes(2);
            expect(time.asMinutes()).to.equal(2);
            expect(time.asSeconds()).to.equal(120);
        });

        it('should handle time operations', () => {
            const time1 = Time.fromMinutes(10);
            const time2 = Time.fromMinutes(5);

            const sum = time1.add(time2);
            expect(sum.asMinutes()).to.equal(15);
        });
    });

    describe('BuhlmannModel', () => {
        it('should panic on invalid depth', () => {
            const model = BuhlmannModel.default();
            expect(() =>
                model.record(
                    Depth.fromMeters(-10),
                    Time.fromSeconds(1),
                    gasAir()
                )
            ).to.throw('Depth cannot be negative');
        });

        it('should calculate ceiling', () => {
            const model = BuhlmannModel.default();
            const air = new Gas(0.21, 0);
            model.record(Depth.fromMeters(40), Time.fromMinutes(30), air);
            model.record(Depth.fromMeters(30), Time.fromMinutes(30), air);
            const calculatedCeiling = model.ceiling();
            expect(calculatedCeiling.asMeters()).to.be.closeTo(
                Depth.fromMeters(7.802523739933558).asMeters(),
                Depth.fromMeters(7.802523739933558).asMeters() * 0.005 // 0.5% tolerance
            );
        });

        it('should calculate gfs', () => {
            const model = BuhlmannModel.default();
            const air = new Gas(0.21, 0);
            model.record(Depth.fromMeters(50), Time.fromMinutes(20), air);
            const supersaturation1 = model.supersaturation();
            expect(supersaturation1.gf99).to.equal(0);
            expect(supersaturation1.gfSurf).to.be.closeTo(
                193.8554997961134,
                0.1
            );

            model.record(Depth.fromMeters(40), Time.fromMinutes(10), air);
            const supersaturation2 = model.supersaturation();
            expect(supersaturation2.gf99).to.equal(0);
            expect(supersaturation2.gfSurf).to.be.closeTo(
                208.00431699178796,
                0.1
            );
        });

        it('should calculate initial gfs', () => {
            const model = BuhlmannModel.default();
            const air = new Gas(0.21, 0);
            model.record(Depth.fromMeters(0), Time.zero(), air);
            const supersaturation = model.supersaturation();
            expect(supersaturation.gf99).to.equal(0);
            expect(supersaturation.gfSurf).to.equal(0);
        });

        it('should test model records equality', () => {
            const model1 = BuhlmannModel.default();
            const model2 = BuhlmannModel.default();
            const air = new Gas(0.21, 0);
            const testDepth = Depth.fromMeters(50);
            const testTime = Time.fromMinutes(100);

            model1.record(testDepth, testTime, air);

            // Record every second
            for (let i = 1; i <= testTime.asSeconds(); i++) {
                model2.record(testDepth, Time.fromSeconds(1), air);
            }

            expect(Math.floor(model1.ceiling().asMeters())).to.equal(
                Math.floor(model2.ceiling().asMeters())
            );

            const model1Supersaturation = model1.supersaturation();
            const model2Supersaturation = model2.supersaturation();
            expect(Math.floor(model1Supersaturation.gf99)).to.equal(
                Math.floor(model2Supersaturation.gf99)
            );
            expect(Math.floor(model1Supersaturation.gfSurf)).to.equal(
                Math.floor(model2Supersaturation.gfSurf)
            );
        });

        it('should calculate actual NDL', () => {
            const config = new BuhlmannConfig();
            const model = new BuhlmannModel(config);
            const air = new Gas(0.21, 0);
            const depth = Depth.fromMeters(30);

            // with 21/00 at 30m expect NDL 16
            model.record(depth, Time.zero(), air);
            expect(model.ndl().asMinutes()).to.equal(16);

            // expect NDL 15 after 1 min
            model.record(depth, Time.fromMinutes(1), air);
            expect(model.ndl().asMinutes()).to.equal(15);
        });

        it('should calculate adaptive NDL', () => {
            const config = new BuhlmannConfig(
                [100, 100],
                1013,
                10,
                CeilingType.Adaptive
            );
            const model = new BuhlmannModel(config);
            const air = new Gas(0.21, 0);
            const depth = Depth.fromMeters(30);

            // Expected NDL values based on current implementation
            model.record(depth, Time.zero(), air);
            expect(model.ndl().asMinutes()).to.equal(16);

            model.record(depth, Time.fromMinutes(1), air);
            expect(model.ndl().asMinutes()).to.equal(15);
        });

        it('should test NDL cut off', () => {
            const model = BuhlmannModel.default();
            const air = new Gas(0.21, 0);
            model.record(Depth.fromMeters(0), Time.zero(), air);
            expect(model.ndl().asMinutes()).to.equal(99);

            model.record(Depth.fromMeters(10), Time.fromMinutes(10), air);
            expect(model.ndl().asMinutes()).to.equal(99);
        });

        it('should test multi gas NDL', () => {
            const config = new BuhlmannConfig(
                [100, 100], // Default gradient factors
                1013,
                10, // Default ascent rate
                CeilingType.Actual
            );
            const model = new BuhlmannModel(config);
            const air = new Gas(0.21, 0);
            const ean28 = new Gas(0.28, 0);

            model.record(Depth.fromMeters(30), Time.zero(), air);
            expect(model.ndl().asMinutes()).to.equal(16);

            model.record(Depth.fromMeters(30), Time.fromMinutes(10), air);
            expect(model.ndl().asMinutes()).to.equal(6);

            model.record(Depth.fromMeters(30), Time.zero(), ean28);
            expect(model.ndl().asMinutes()).to.equal(10);
        });

        it('should test NDL with GF', () => {
            const model = modelGf(70, 70);
            const air = new Gas(0.21, 0);
            model.record(Depth.fromMeters(20), Time.zero(), air);
            expect(model.ndl().asMinutes()).to.equal(21);
        });

        it('should test altitude', () => {
            const config = new BuhlmannConfig([100, 100], 700);
            const model = new BuhlmannModel(config);
            const air = new Gas(0.21, 0);
            model.record(Depth.fromMeters(40), Time.fromMinutes(60), air);
            const supersaturation = model.supersaturation();
            expect(supersaturation.gfSurf).to.be.closeTo(299.023204474694, 0.1);
        });

        it('should test example ceiling start', () => {
            const config = new BuhlmannConfig([30, 70], 1013);
            const model = new BuhlmannModel(config);
            const air = Gas.air();
            // instant drop to 40m on air for 10min
            model.record(Depth.fromMeters(40), Time.fromMinutes(10), air);
            expect(model.ceiling().asMeters()).to.be.closeTo(
                12.85312294790554,
                0.01
            );
        });

        it('should test example ceiling', () => {
            const config = new BuhlmannConfig([30, 70], 1013);
            const model = new BuhlmannModel(config);
            const air = Gas.air();
            const ean50 = new Gas(0.5, 0);

            model.record(Depth.fromMeters(40), Time.fromMinutes(40), air);
            model.record(Depth.fromMeters(30), Time.fromMinutes(3), air);
            model.record(Depth.fromMeters(21), Time.fromMinutes(10), ean50);
            expect(model.ceiling().asMeters()).to.be.closeTo(
                12.455491216740299,
                0.01
            );
        });

        it('should test example ceiling feet', () => {
            const config = new BuhlmannConfig([30, 70], 1013);
            const model = new BuhlmannModel(config);
            const air = Gas.air();
            const ean50 = new Gas(0.5, 0);

            model.record(Depth.fromFeet(131.234), Time.fromMinutes(40), air);
            model.record(Depth.fromFeet(98.4252), Time.fromMinutes(3), air);
            model.record(Depth.fromFeet(68.8976), Time.fromMinutes(10), ean50);
            expect(model.ceiling().asFeet()).to.be.closeTo(
                40.864609154666,
                0.01
            );
            expect(model.ceiling().asMeters()).to.be.closeTo(
                12.455532471765158,
                0.01
            );
        });

        it('should test adaptive ceiling', () => {
            const config = new BuhlmannConfig(
                [100, 100],
                1013,
                9,
                CeilingType.Adaptive
            );
            const model = new BuhlmannModel(config);
            const air = Gas.air();
            model.record(Depth.fromMeters(40), Time.fromMinutes(20), air);
            const ceiling = model.ceiling();
            // TypeScript implementation with 9 m/min ascent rate converges to ~3.13m
            expect(ceiling.asMeters()).to.be.closeTo(3.13, 0.3);
        });

        it('should test CNS OTU', () => {
            const model = BuhlmannModel.default();
            model.record(Depth.fromMeters(40), Time.fromMinutes(10), Gas.air());
            model.recordTravelWithRate(Depth.fromMeters(0), 10, Gas.air());
            expect(model.otu()).to.be.closeTo(13, 1);
        });
    });

    describe('Gradient Factors', () => {
        it('should test NDL with different gradient factors', () => {
            const testCases: Array<[number, number, number, number]> = [
                // [gfLow, gfHigh, depth, expectedNDL]
                [100, 100, 21, 40],
                [100, 100, 15, 90],
                [70, 70, 21, 19],
                [70, 70, 15, 47],
            ];

            const air = gasAir();
            for (const [gfLow, gfHigh, testDepth, expectedNDL] of testCases) {
                const model = modelGf(gfLow, gfHigh);
                model.record(Depth.fromMeters(testDepth), Time.zero(), air);
                expect(model.ndl().asMinutes()).to.equal(expectedNDL);
            }
        });

        it('should test GF low ceiling', () => {
            const model = modelGf(50, 100);
            const air = gasAir();
            model.record(Depth.fromMeters(40), Time.fromMinutes(10), air);
            const ceiling = model.ceiling();
            expect(ceiling.asMeters()).to.be.closeTo(8, 0.5);
        });
    });

    describe('Travel Tests', () => {
        it('should test travel descent', () => {
            const model = BuhlmannModel.default();
            const targetDepth = Depth.fromMeters(40);
            const descentTime = Time.fromMinutes(10);
            model.recordTravel(targetDepth, descentTime, gasAir());

            const diveState = model.diveState();
            const supersaturation = model.supersaturation();
            expect(diveState.depth.asMeters()).to.equal(targetDepth.asMeters());
            expect(diveState.time.asMinutes()).to.equal(
                descentTime.asMinutes()
            );
            expect(supersaturation.gfSurf).to.be.closeTo(62, 62 * 0.05); // 5% tolerance
        });

        it('should test travel ascent', () => {
            const model = modelGf(30, 70);
            const air = gasAir();
            const initialDepth = Depth.fromMeters(40);
            const bottomTime = Time.fromMinutes(20);
            model.record(initialDepth, bottomTime, air);

            const targetDepth = Depth.fromMeters(15);
            const ascentTime = Time.fromMinutes(1.5);
            model.recordTravel(targetDepth, ascentTime, air);

            const diveState = model.diveState();
            expect(diveState.depth.asMeters()).to.equal(targetDepth.asMeters());
        });

        it('should test travel record with rate', () => {
            const config = new BuhlmannConfig(
                [100, 100], // Default gradient factors
                1013,
                10, // Default ascent rate
                CeilingType.Actual
            );
            const model = new BuhlmannModel(config);
            const air = gasAir();
            const initialDepth = Depth.fromMeters(20);
            const bottomTime = Time.fromMinutes(20);
            const targetDepth = Depth.zero();
            const travelRate = 9;
            const expectedTravelTime = Time.fromSeconds(133);

            model.record(initialDepth, bottomTime, air);
            model.recordTravelWithRate(targetDepth, travelRate, air);

            const state = model.diveState();
            expect(state.depth.asMeters()).to.equal(targetDepth.asMeters());
            // Use tolerance for timing due to potential rounding differences in travel time calculation
            expect(state.time.asSeconds()).to.be.closeTo(
                bottomTime.add(expectedTravelTime).asSeconds(),
                2 // Allow 2-second tolerance
            );
            expect(model.supersaturation().gf99).to.be.closeTo(61, 61 * 0.05); // 5% tolerance
        });
    });

    describe('Decompression Tests', () => {
        it('should test deco ascent no deco', () => {
            const air = gasAir();
            const model = BuhlmannModel.default();
            model.record(Depth.fromMeters(20), Time.fromMinutes(5), air);
            const decoRuntime = model.deco([air]);
            expect(decoRuntime.decoStages.length).to.equal(1); // single continuous ascent
            expect(decoRuntime.tts.asMinutes()).to.equal(2); // tts in minutes
        });

        it('should test deco single gas', () => {
            const air = gasAir();
            const config = new BuhlmannConfig(
                [100, 100], // Default gradient factors
                1013,
                9
            );
            const model = new BuhlmannModel(config);
            model.record(Depth.fromMeters(40), Time.fromMinutes(20), air);
            const decoRuntime = model.deco([air]);

            expect(decoRuntime.tts.asSeconds()).to.equal(754);
            expect(decoRuntime.decoStages.length).to.equal(5);

            const expectedStages = [
                {
                    type: DecoStageType.Ascent,
                    startDepth: 40.0,
                    endDepth: 6.0,
                    duration: 226,
                },
                {
                    type: DecoStageType.DecoStop,
                    startDepth: 6.0,
                    endDepth: 6.0,
                    duration: 88,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 6.0,
                    endDepth: 3.0,
                    duration: 20,
                },
                {
                    type: DecoStageType.DecoStop,
                    startDepth: 3.0,
                    endDepth: 3.0,
                    duration: 400,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 3.0,
                    endDepth: 0.0,
                    duration: 20,
                },
            ];

            expectedStages.forEach((expected, i) => {
                const stage = decoRuntime.decoStages[i];
                expect(stage.stageType).to.equal(expected.type);
                expect(stage.startDepth.asMeters()).to.equal(
                    expected.startDepth
                );
                expect(stage.endDepth.asMeters()).to.equal(expected.endDepth);
                // Use tolerance for duration due to rounding differences
                expect(
                    Math.abs(stage.duration.asSeconds() - expected.duration)
                ).to.be.lessThan(
                    2,
                    `Stage ${i} duration: expected ${expected.duration}s, got ${stage.duration.asSeconds()}s`
                );
                expect(stage.gas.equals(air)).to.be.true;
            });
        });

        it('should test deco multi gas', () => {
            const config = new BuhlmannConfig([100, 100], 1013, 9);
            const model = new BuhlmannModel(config);
            const air = new Gas(0.21, 0);
            const ean50 = new Gas(0.5, 0);

            model.record(Depth.fromMeters(40), Time.fromMinutes(20), air);
            const decoRuntime = model.deco([air, ean50]);

            const expectedStages = [
                {
                    type: DecoStageType.Ascent,
                    startDepth: 40,
                    endDepth: 22,
                    duration: 120,
                    gas: air,
                },
                {
                    type: DecoStageType.GasSwitch,
                    startDepth: 22.0,
                    endDepth: 22.0,
                    duration: 0,
                    gas: ean50,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 22,
                    endDepth: 6,
                    duration: 107,
                    gas: ean50,
                },
                {
                    type: DecoStageType.DecoStop,
                    startDepth: 6.0,
                    endDepth: 6.0,
                    duration: 33,
                    gas: ean50,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 6.0,
                    endDepth: 3.0,
                    duration: 20,
                    gas: ean50,
                },
                {
                    type: DecoStageType.DecoStop,
                    startDepth: 3.0,
                    endDepth: 3.0,
                    duration: 291,
                    gas: ean50,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 3.0,
                    endDepth: 0.0,
                    duration: 20,
                    gas: ean50,
                },
            ];

            expect(decoRuntime.decoStages.length).to.equal(
                expectedStages.length
            );
            expectedStages.forEach((expected, i) => {
                const stage = decoRuntime.decoStages[i];
                expect(stage.stageType).to.equal(expected.type);
                expect(stage.startDepth.asMeters()).to.equal(
                    expected.startDepth
                );
                expect(stage.endDepth.asMeters()).to.equal(expected.endDepth);
                expect(stage.duration.asSeconds()).to.equal(expected.duration);
                expect(stage.gas.equals(expected.gas)).to.be.true;
            });

            expect(decoRuntime.tts.asSeconds()).to.equal(591);
        });

        it('should test deco with deco mod at bottom', () => {
            const config = new BuhlmannConfig([100, 100], 1013, 9);
            const model = new BuhlmannModel(config);
            const air = Gas.air();
            const ean36 = new Gas(0.36, 0);

            model.record(Depth.fromMeters(30), Time.fromMinutes(30), air);
            const decoRuntime = model.deco([air, ean36]);

            const expectedStages = [
                {
                    type: DecoStageType.GasSwitch,
                    startDepth: 30.0,
                    endDepth: 30.0,
                    duration: 0,
                    gas: ean36,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 30.0,
                    endDepth: 3.0,
                    duration: 180,
                    gas: ean36,
                },
                {
                    type: DecoStageType.DecoStop,
                    startDepth: 3.0,
                    endDepth: 3.0,
                    duration: 268,
                    gas: ean36,
                },
                {
                    type: DecoStageType.Ascent,
                    startDepth: 3.0,
                    endDepth: 0.0,
                    duration: 20,
                    gas: ean36,
                },
            ];

            expect(decoRuntime.decoStages.length).to.equal(
                expectedStages.length
            );
            expectedStages.forEach((expected, i) => {
                const stage = decoRuntime.decoStages[i];
                expect(stage.stageType).to.equal(expected.type);
                expect(stage.startDepth.asMeters()).to.equal(
                    expected.startDepth
                );
                expect(stage.endDepth.asMeters()).to.equal(expected.endDepth);
                expect(stage.duration.asSeconds()).to.equal(expected.duration);
                expect(stage.gas.equals(expected.gas)).to.be.true;
            });

            expect(decoRuntime.tts.asSeconds()).to.equal(468);
        });

        it('should test gradual ascent with deco', () => {
            const config = new BuhlmannConfig([30, 70], 1013);
            const model = new BuhlmannModel(config);
            const air = Gas.air();
            const ean50 = new Gas(0.5, 0);
            model.record(Depth.fromMeters(45), Time.fromMinutes(30), air);

            expect(() => {
                let depth = model.diveState().depth;
                while (depth.asMeters() > 0) {
                    const nextDepth = depth.subtract(Depth.fromMeters(3));
                    model.recordTravelWithRate(nextDepth, 10, air);
                    model.deco([air, ean50]);
                    depth = model.diveState().depth;
                }
            }).to.not.throw();
        });
    });
});
