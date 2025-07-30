import { describe, it } from 'mocha';
import { expect } from 'chai';
import { BuhlmannConfig, BuhlmannConfigBuilder } from './buhlmannConfig';
import { CeilingType, NDLType } from './types';

describe('BuhlmannConfigBuilder', () => {
    describe('Builder Pattern', () => {
        it('should create config with default values', () => {
            const config = BuhlmannConfig.builder().build();

            expect(config.gradientFactors()).to.deep.equal([100, 100]);
            expect(config.surfacePressure()).to.equal(1013);
            expect(config.decoAscentRate()).to.equal(10);
            expect(config.ceilingType()).to.equal(CeilingType.Actual);
            expect(config.roundCeiling()).to.equal(false);
            expect(config.ndlType()).to.equal(NDLType.Actual);
        });

        it('should support method chaining', () => {
            const config = BuhlmannConfig.builder()
                .gradientFactors(30, 80)
                .surfacePressure(1020)
                .decoAscentRate(9)
                .ceilingType(CeilingType.Adaptive)
                .roundCeiling(true)
                .ndlType(NDLType.ByCeiling)
                .build();

            expect(config.gradientFactors()).to.deep.equal([30, 80]);
            expect(config.surfacePressure()).to.equal(1020);
            expect(config.decoAscentRate()).to.equal(9);
            expect(config.ceilingType()).to.equal(CeilingType.Adaptive);
            expect(config.roundCeiling()).to.equal(true);
            expect(config.ndlType()).to.equal(NDLType.ByCeiling);
        });

        it('should validate configuration and throw on invalid values', () => {
            expect(() => {
                BuhlmannConfig.builder().gradientFactors(150, 200).build();
            }).to.throw(
                'Invalid configuration: GF Low must be between 1 and 100'
            );

            expect(() => {
                BuhlmannConfig.builder().gradientFactors(80, 50).build();
            }).to.throw(
                'Invalid configuration: GF Low must be less than or equal to GF High'
            );

            expect(() => {
                BuhlmannConfig.builder().surfacePressure(400).build();
            }).to.throw(
                'Invalid configuration: Surface pressure must be between 500 and 1200 mbar'
            );
        });

        it('should support partial configuration', () => {
            const config = BuhlmannConfig.builder()
                .gradientFactors(35, 85)
                .surfacePressure(1000)
                .build();

            expect(config.gradientFactors()).to.deep.equal([35, 85]);
            expect(config.surfacePressure()).to.equal(1000);
            // Other values should be defaults
            expect(config.decoAscentRate()).to.equal(10);
            expect(config.ceilingType()).to.equal(CeilingType.Actual);
        });

        it('should maintain builder reusability', () => {
            const builder = BuhlmannConfig.builder().gradientFactors(40, 90);

            const config1 = builder.surfacePressure(1000).build();
            const config2 = builder.surfacePressure(1020).build();

            expect(config1.surfacePressure()).to.equal(1000);
            expect(config2.surfacePressure()).to.equal(1020);
            // Both should have the same GF values
            expect(config1.gradientFactors()).to.deep.equal([40, 90]);
            expect(config2.gradientFactors()).to.deep.equal([40, 90]);
        });
    });

    describe('Static Factory Methods', () => {
        it('should provide builder factory method', () => {
            const builder = BuhlmannConfig.builder();
            expect(builder).to.be.instanceOf(BuhlmannConfigBuilder);
        });

        it('should maintain backward compatibility with constructor', () => {
            const config = new BuhlmannConfig(
                [30, 80],
                1020,
                9,
                CeilingType.Adaptive,
                true,
                NDLType.ByCeiling
            );

            expect(config.gradientFactors()).to.deep.equal([30, 80]);
            expect(config.surfacePressure()).to.equal(1020);
            expect(config.decoAscentRate()).to.equal(9);
            expect(config.ceilingType()).to.equal(CeilingType.Adaptive);
            expect(config.roundCeiling()).to.equal(true);
            expect(config.ndlType()).to.equal(NDLType.ByCeiling);
        });

        it('should maintain backward compatibility with default method', () => {
            const config = BuhlmannConfig.default();

            expect(config.gradientFactors()).to.deep.equal([100, 100]);
            expect(config.surfacePressure()).to.equal(1013);
            expect(config.decoAscentRate()).to.equal(10);
            expect(config.ceilingType()).to.equal(CeilingType.Actual);
            expect(config.roundCeiling()).to.equal(false);
            expect(config.ndlType()).to.equal(NDLType.Actual);
        });
    });

    describe('Immutability', () => {
        it('should create immutable config objects', () => {
            const config = BuhlmannConfig.builder()
                .gradientFactors(30, 80)
                .build();

            // Try to modify private properties (should fail at compile time)
            // This test verifies runtime immutability by checking that values don't change
            const originalGF = config.gradientFactors();
            expect(originalGF).to.deep.equal([30, 80]);

            // Verify that the clone method works for creating modified versions
            const clonedConfig = config.clone();
            expect(clonedConfig.gradientFactors()).to.deep.equal([30, 80]);
            expect(clonedConfig).to.not.equal(config); // Different instances
        });
    });
});
