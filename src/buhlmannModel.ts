import { DecoModel, DiveState } from './decoModel';
import { BuhlmannConfig } from './buhlmannConfig';
import { Compartment, Supersaturation } from './compartment';
import { ZHL_16C_N2_16A_HE_VALUES } from './zhlValues';
import {
    AscentRatePerMinute,
    Cns,
    Otu,
    DecoRuntime,
    DecoStage,
    DecoStageType,
    DecoCalculationError,
    CeilingType,
} from './types';
import { Depth } from './depth';
import { Time } from './time';
import { Gas } from './gas';
import { OxTox } from './oxTox';
import { max, min, ceil } from './mathUtils';

const NDL_CUT_OFF_MINS = 99;

interface BuhlmannState {
    depth: Depth;
    time: Time;
    gas: Gas;
    gfLowDepth?: Depth;
    oxTox: OxTox;
}

export class BuhlmannModel extends DecoModel {
    private configuration: BuhlmannConfig;
    private compartments: Compartment[] = [];
    private state: BuhlmannState;
    private sim: boolean;

    constructor(config?: BuhlmannConfig) {
        super();
        this.configuration = config || BuhlmannConfig.default();

        // Validate configuration
        const validationError = this.configuration.validate();
        if (validationError) {
            throw new Error(
                `Config error [${validationError.field}]: ${validationError.reason}`
            );
        }

        this.state = {
            depth: Depth.zero(),
            time: Time.zero(),
            gas: Gas.air(),
            oxTox: OxTox.default(),
        };

        this.sim = false;
        this.createCompartments();
    }

    static default(): BuhlmannModel {
        return new BuhlmannModel();
    }

    config(): BuhlmannConfig {
        return this.configuration;
    }

    diveState(): DiveState {
        return {
            depth: this.state.depth,
            time: this.state.time,
            gas: this.state.gas,
            oxTox: this.state.oxTox,
        };
    }

    record(depth: Depth, time: Time, gas: Gas): void {
        this.validateDepth(depth);
        this.state.depth = depth;
        this.state.gas = gas;
        this.state.time = this.state.time.add(time);

        const record = { depth, time, gas };
        this.recalculate(record);
    }

    recordTravel(targetDepth: Depth, time: Time, gas: Gas): void {
        this.validateDepth(targetDepth);
        this.state.gas = gas;

        let currentDepth = this.state.depth;
        const distance = targetDepth.asMeters() - currentDepth.asMeters();
        const travelTime = time;
        const distRate = distance / travelTime.asSeconds();

        let i = 0;
        while (i < travelTime.asSeconds()) {
            this.state.time = this.state.time.add(Time.fromSeconds(1));
            currentDepth = Depth.fromMeters(currentDepth.asMeters() + distRate);
            const record = {
                depth: currentDepth,
                time: Time.fromSeconds(1),
                gas,
            };
            this.recalculate(record);
            i++;
        }

        this.state.depth = targetDepth;
    }

    recordTravelWithRate(
        targetDepth: Depth,
        rate: AscentRatePerMinute,
        gas: Gas
    ): void {
        const distance = Math.abs(
            targetDepth.asMeters() - this.state.depth.asMeters()
        );
        const travelTimeMinutes = distance / rate;
        const travelTime = Time.fromMinutes(travelTimeMinutes);

        this.recordTravel(targetDepth, travelTime, gas);
    }

    ndl(): Time {
        let ndl = Time.fromMinutes(NDL_CUT_OFF_MINS);

        if (this.inDeco()) {
            return Time.zero();
        }

        // Create a simulation model based on current model's state
        const simModel = this.fork();

        // Iterate simulation model over 1min records until NDL cut-off or in deco
        const interval = Time.fromMinutes(1);
        for (let i = 0; i < NDL_CUT_OFF_MINS; i++) {
            simModel.record(this.state.depth, interval, this.state.gas);
            if (simModel.inDeco()) {
                ndl = interval.multiply(i);
                break;
            }
        }
        return ndl;
    }

    // Fork method for simulation
    private fork(): BuhlmannModel {
        const cloned = new BuhlmannModel(this.configuration);
        cloned.state = {
            depth: this.state.depth,
            time: this.state.time,
            gas: this.state.gas,
            gfLowDepth: this.state.gfLowDepth,
            oxTox: this.state.oxTox.clone(),
        };
        cloned.compartments = this.compartments.map(c => c.clone());
        cloned.sim = true;
        return cloned;
    }

    ceiling(): Depth {
        const config = this.config();
        let ceilingType = config.ceilingType();

        // Simulations always use actual ceiling
        if (this.sim) {
            ceilingType = CeilingType.Actual;
        }

        const leadingComp = this.leadingComp();
        let ceiling: Depth;

        switch (ceilingType) {
            case CeilingType.Actual:
                ceiling = leadingComp.ceiling();
                break;
            case CeilingType.Adaptive:
                // Adaptive ceiling calculation: simulate ascending to ceiling iteratively
                const simModel = this.fork();
                const simGas = simModel.diveState().gas;
                let calculatedCeiling = simModel.ceiling(); // This recursively calls with Actual ceiling

                let iterations = 0;
                while (true) {
                    const simDepth = simModel.diveState().depth;

                    // Break if at surface or at/below the ceiling
                    if (simDepth.asMeters() <= 0 || simDepth.asMeters() <= calculatedCeiling.asMeters()) {
                        break;
                    }

                    // Ascend to the current ceiling at configured ascent rate
                    simModel.recordTravelWithRate(calculatedCeiling, config.decoAscentRate(), simGas);

                    // Recalculate ceiling after ascent
                    calculatedCeiling = simModel.ceiling();

                    iterations++;
                    if (iterations > 50) { // Increase iteration limit for better convergence
                        break;
                    }
                }

                ceiling = calculatedCeiling;
                break;
            default:
                throw new Error(`Unsupported ceiling type: ${ceilingType}`);
        }

        if (config.roundCeiling()) {
            ceiling = Depth.fromMeters(Math.ceil(ceiling.asMeters()));
        }

        return ceiling;
    }

    deco(gasMixes: Gas[]): DecoRuntime {
        // Create a simulation copy of the model
        const simModel = this.clone();
        simModel.sim = true;

        if (gasMixes.length === 0) {
            throw new Error('Empty gas list');
        }
        if (!gasMixes.find(g => g.equals(simModel.state.gas))) {
            throw new Error('Current gas not in list');
        }

        const stages: DecoStage[] = [];

        while (true) {
            const preStageDepth = simModel.state.depth;
            const preStageTime = simModel.state.time;
            const preStageGas = simModel.state.gas;

            const ceiling = simModel.ceiling();

            const [decoAction, nextSwitchGas] = this.nextDecoAction(
                simModel,
                gasMixes
            );

            if (decoAction === null) {
                break; // Decompression finished
            }

            switch (decoAction) {
                case DecoStageType.Ascent: {
                    const stopDepth = this.decoStopDepth(ceiling);
                    simModel.recordTravelWithRate(
                        stopDepth,
                        this.configuration.decoAscentRate(),
                        preStageGas
                    );
                    const postStageState = simModel.diveState();
                    stages.push({
                        stageType: DecoStageType.Ascent,
                        startDepth: preStageDepth,
                        endDepth: postStageState.depth,
                        duration: postStageState.time.subtract(preStageTime),
                        gas: postStageState.gas,
                    });
                    break;
                }
                case DecoStageType.DecoStop: {
                    const stopDepth = this.decoStopDepth(ceiling);
                    simModel.record(
                        preStageDepth,
                        Time.fromSeconds(1),
                        preStageGas
                    );
                    const postStageState = simModel.diveState();
                    this.registerDecoStage(stages, {
                        stageType: DecoStageType.DecoStop,
                        startDepth: stopDepth,
                        endDepth: stopDepth,
                        duration: postStageState.time.subtract(preStageTime),
                        gas: postStageState.gas,
                    });
                    break;
                }
                case DecoStageType.GasSwitch: {
                    if (nextSwitchGas) {
                        const switchMod = nextSwitchGas.maxOperatingDepth(1.6);
                        if (preStageDepth.greaterThan(switchMod)) {
                            simModel.recordTravelWithRate(
                                switchMod,
                                this.configuration.decoAscentRate(),
                                preStageGas
                            );
                            const postAscentState = simModel.diveState();
                            stages.push({
                                stageType: DecoStageType.Ascent,
                                startDepth: preStageDepth,
                                endDepth: postAscentState.depth,
                                duration:
                                    postAscentState.time.subtract(preStageTime),
                                gas: preStageGas,
                            });
                        }

                        simModel.record(
                            simModel.diveState().depth,
                            Time.zero(),
                            nextSwitchGas
                        );
                        const postSwitchState = simModel.diveState();
                        this.registerDecoStage(stages, {
                            stageType: DecoStageType.GasSwitch,
                            startDepth: postSwitchState.depth,
                            endDepth: postSwitchState.depth,
                            duration: Time.zero(),
                            gas: nextSwitchGas,
                        });
                    }
                    break;
                }
            }
        }

        const tts = stages.reduce(
            (total, stage) => total.add(stage.duration),
            Time.zero()
        );

        return {
            decoStages: stages,
            tts,
            ttsSurface: tts, // Simplified for now
            sim: true,
        };
    }

    private nextDecoAction(
        simModel: BuhlmannModel,
        gasMixes: Gas[]
    ): [DecoStageType | null, Gas | null] {
        const currentDepth = simModel.state.depth;
        const currentGas = simModel.state.gas;

        if (currentDepth.asMeters() <= 0) {
            return [null, null];
        }

        const ceiling = simModel.ceiling();

        if (ceiling.asMeters() <= 0) {
            return [DecoStageType.Ascent, null];
        }

        if (currentDepth.lessThan(this.decoStopDepth(ceiling))) {
            // Missed stop, force ascent to stop depth
            return [DecoStageType.Ascent, null];
        }

        const nextGas = this.nextSwitchGas(currentDepth, currentGas, gasMixes);
        if (nextGas && !nextGas.equals(currentGas)) {
            const mod = nextGas.maxOperatingDepth(1.6);
            if (currentDepth.asMeters() <= mod.asMeters()) {
                return [DecoStageType.GasSwitch, nextGas];
            }
        }

        if (currentDepth.equals(this.decoStopDepth(ceiling))) {
            return [DecoStageType.DecoStop, null];
        }

        if (nextGas) {
            const mod = nextGas.maxOperatingDepth(1.6);
            if (mod.greaterThanOrEqual(ceiling)) {
                return [DecoStageType.GasSwitch, nextGas];
            }
        }

        return [DecoStageType.Ascent, null];
    }

    private nextSwitchGas(
        currentDepth: Depth,
        currentGas: Gas,
        gasMixes: Gas[]
    ): Gas | null {
        const currentPPO2 = currentGas.partialPressures(
            currentDepth,
            this.configuration.surfacePressure()
        ).o2;

        const candidates = gasMixes.filter(gas => {
            const ppO2 = gas.partialPressures(
                currentDepth,
                this.configuration.surfacePressure()
            ).o2;
            return ppO2 > currentPPO2;
        });

        if (candidates.length === 0) {
            return null;
        }

        candidates.sort((a, b) => a.o2 - b.o2);
        return candidates[0];
    }

    private decoStopDepth(ceiling: Depth): Depth {
        const window = 3; // 3m window
        const depth = Math.ceil(ceiling.asMeters() / window) * window;
        return Depth.fromMeters(depth);
    }

    private registerDecoStage(stages: DecoStage[], stage: DecoStage): void {
        const lastStage = stages.length > 0 ? stages[stages.length - 1] : null;
        if (
            lastStage &&
            lastStage.stageType === stage.stageType &&
            lastStage.endDepth.equals(stage.startDepth) &&
            lastStage.gas.equals(stage.gas)
        ) {
            lastStage.duration = lastStage.duration.add(stage.duration);
            lastStage.endDepth = stage.endDepth;
        } else {
            stages.push(stage);
        }
    }

    cns(): Cns {
        return this.state.oxTox.cns;
    }

    otu(): Otu {
        return this.state.oxTox.otu;
    }

    // Get supersaturation information - maximum across all compartments
    supersaturation(): { gf99: number; gfSurf: number } {
        let accGf99 = 0;
        let accGfSurf = 0;

        for (const compartment of this.compartments) {
            const supersaturation = compartment.supersaturation(
                this.configuration.surfacePressure(),
                this.state.depth
            );
            if (supersaturation.gf99 > accGf99) {
                accGf99 = supersaturation.gf99;
            }
            if (supersaturation.gfSurf > accGfSurf) {
                accGfSurf = supersaturation.gfSurf;
            }
        }

        return {
            gf99: accGf99,
            gfSurf: accGfSurf,
        };
    }

    // Leading compartment - the one with highest min tolerable ambient pressure
    private leadingComp(): Compartment {
        let leadingComp = this.compartments[0];
        for (const compartment of this.compartments.slice(1)) {
            if (compartment.minTolerableAmbPressure > leadingComp.minTolerableAmbPressure) {
                leadingComp = compartment;
            }
        }
        return leadingComp;
    }

    // Get supersaturation information for all compartments
    supersaturationAll(): Supersaturation[] {
        return this.compartments.map(compartment =>
            compartment.supersaturation(
                this.configuration.surfacePressure(),
                this.state.depth
            )
        );
    }

    // Get tissue pressures for all compartments
    tissurePressures(): Array<{ n2: number; he: number; total: number }> {
        return this.compartments.map(
            compartment => compartment.tissurePressures
        );
    }

    private createCompartments(): void {
        this.compartments = ZHL_16C_N2_16A_HE_VALUES.map((params, index) => {
            return new Compartment(index + 1, params, this.configuration);
        });
    }

    private recalculate(record: { depth: Depth; time: Time; gas: Gas }): void {
        this.recalculateCompartments(record);
        if (!this.sim) {
            this.recalculateOxTox(record);
        }
    }

    private recalculateCompartments(record: { depth: Depth; time: Time; gas: Gas }): void {
        const [gfLow, gfHigh] = this.configuration.gradientFactors();

        // First recalculate all compartments with GF high
        for (const compartment of this.compartments) {
            compartment.recalculate(record, gfHigh, this.configuration.surfacePressure());
        }

        // If GF slope is enabled, recalculate with appropriate GF
        if (gfHigh !== gfLow) {
            const maxGf = this.calcMaxSlopedGF(record.depth);

            // For simplicity, we'll recalculate the leading compartment with the sloped GF
            const leadingComp = this.leadingComp();
            leadingComp.recalculate(
                { ...record, time: Time.zero() },
                maxGf,
                this.configuration.surfacePressure()
            );
        }
    }

    private recalculateOxTox(record: { depth: Depth; time: Time; gas: Gas }): void {
        const partialPressures = record.gas.inspiredPartialPressures(
            record.depth,
            this.configuration.surfacePressure()
        );
        this.state.oxTox.addExposure(partialPressures.o2, record.time);
    }

    private recalculateLeadingCompartmentWithGF(
        depth: Depth,
        gas: Gas,
        maxGF: number
    ): void {
        // This method is now empty as the logic is integrated into the main ceiling calculation.
    }

    private calcMaxSlopedGF(depth: Depth): number {
        const [gfLow, gfHigh] = this.configuration.gradientFactors();
        const inDeco = this.ceiling().greaterThan(Depth.zero());

        if (!inDeco) {
            return gfHigh;
        }

        if (!this.state.gfLowDepth) {
            // Direct calculation for gf_low_depth
            const surfacePressureBar = this.configuration.surfacePressure() / 1000.0;
            const gfLowFraction = gfLow / 100.0;

            let maxCalculatedDepthM = 0.0;

            for (const comp of this.compartments) {
                const totalIp = comp.totalIp;
                const [, aWeighted, bWeighted] = comp.weightedZhlParams(comp.heIp, comp.n2Ip);

                // General case: P_amb = (P_ip - G*a) / (1 - G + G/b)
                const maxAmbP = (totalIp - gfLowFraction * aWeighted) /
                    (1.0 - gfLowFraction + gfLowFraction / bWeighted);

                const maxDepth = Math.max(0.0, 10.0 * (maxAmbP - surfacePressureBar));
                maxCalculatedDepthM = Math.max(maxCalculatedDepthM, maxDepth);
            }

            const calculatedGfLowDepth = Depth.fromMeters(maxCalculatedDepthM);
            this.state.gfLowDepth = calculatedGfLowDepth;
        }

        if (depth.greaterThan(this.state.gfLowDepth)) {
            return gfLow;
        }

        return this.gfSlopePoint(this.state.gfLowDepth, depth);
    }

    private gfSlopePoint(gfLowDepth: Depth, depth: Depth): number {
        const [gfLow, gfHigh] = this.configuration.gradientFactors();
        const slopePoint = gfHigh - (((gfHigh - gfLow) / gfLowDepth.asMeters()) * depth.asMeters());
        return slopePoint;
    }

    // Debug method to expose current GF
    getCurrentGF(): number {
        return this.calcMaxSlopedGF(this.state.depth);
    }

    private validateDepth(depth: Depth): void {
        if (depth.lessThan(Depth.zero())) {
            throw new Error('Depth cannot be negative');
        }

        if (depth.asMeters() > 200) {
            throw new Error('Depth exceeds maximum supported depth (200m)');
        }
    }

    private clone(): BuhlmannModel {
        const cloned = new BuhlmannModel(this.configuration.clone());
        cloned.state = {
            depth: this.state.depth,
            time: this.state.time,
            gas: this.state.gas,
            gfLowDepth: this.state.gfLowDepth,
            oxTox: this.state.oxTox.clone(),
        };
        cloned.compartments = this.compartments.map(c => c.clone());
        cloned.sim = true;
        return cloned;
    }
}
