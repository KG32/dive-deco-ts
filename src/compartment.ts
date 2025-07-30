import { Pressure, PartialPressures } from './types';
import { Depth } from './depth';
import { Time } from './time';
import { exp } from './mathUtils';
import { ZHLParams } from './zhlValues';
import { BuhlmannConfig } from './buhlmannConfig';

export interface Supersaturation {
    gf99: number; // Current gradient factor percentage
    gfSurf: number; // Gradient factor for surfacing
}

interface RecordData {
    depth: Depth;
    time: Time;
    gas: {
        inspiredPartialPressures: (
            depth: Depth,
            surfacePressure: number
        ) => PartialPressures;
    };
}

export class Compartment {
    public no: number;
    public minTolerableAmbPressure: Pressure;
    public heIp: Pressure;
    public n2Ip: Pressure;
    public totalIp: Pressure;
    public mValueRaw: Pressure;
    public mValueCalc: Pressure;
    public params: ZHLParams;
    private modelConfig: BuhlmannConfig;

    constructor(no: number, params: ZHLParams, modelConfig: BuhlmannConfig) {
        this.no = no;
        this.params = params;
        this.modelConfig = modelConfig;

        // Initialize with air at surface
        const initGasCompoundPressures = this.getAirInspiredPartialPressures(
            Depth.zero(),
            modelConfig.surfacePressure()
        );

        this.n2Ip = initGasCompoundPressures.n2;
        this.heIp = initGasCompoundPressures.he;
        this.totalIp = this.heIp + this.n2Ip;

        // Calculate initial values
        const [, gfHigh] = modelConfig.gradientFactors();
        this.mValueRaw = this.mValue(
            Depth.zero(),
            modelConfig.surfacePressure(),
            100
        );
        this.mValueCalc = this.mValueRaw;
        this.minTolerableAmbPressure = this.minTolerableAmbPressureCalc(gfHigh);
    }

    private getAirInspiredPartialPressures(
        depth: Depth,
        surfacePressure: number
    ): PartialPressures {
        // Air composition: 21% O2, 79% N2, 0% He
        const ambientPressure = surfacePressure / 1000 + depth.asMeters() / 10;
        const waterVaporPressure = 0.0627; // bar at 37°C
        const inspiredPressure = ambientPressure - waterVaporPressure;

        return {
            o2: 0.21 * inspiredPressure,
            n2: 0.79 * inspiredPressure,
            he: 0.0 * inspiredPressure,
        };
    }

    // Recalculate tissue inert gases saturation and tolerable pressure
    recalculate(
        record: RecordData,
        maxGf: number,
        surfacePressure: number
    ): void {
        const [heInertPressure, n2InertPressure] =
            this.compartmentInertPressure(record, surfacePressure);

        this.heIp = heInertPressure;
        this.n2Ip = n2InertPressure;
        this.totalIp = heInertPressure + n2InertPressure;

        this.mValueRaw = this.mValue(record.depth, surfacePressure, 100);
        this.mValueCalc = this.mValue(record.depth, surfacePressure, maxGf);

        this.minTolerableAmbPressure = this.minTolerableAmbPressureCalc(maxGf);
    }

    // Tissue ceiling as depth
    ceiling(): Depth {
        let ceil =
            (this.minTolerableAmbPressure -
                this.modelConfig.surfacePressure() / 1000.0) *
            10.0;
        // Cap ceiling at 0 if min tolerable leading compartment pressure depth equivalent negative
        if (ceil < 0.0) {
            ceil = 0.0;
        }
        return Depth.fromMeters(ceil);
    }

    // Tissue supersaturation (gf99, surface gf)
    supersaturation(surfacePressure: number, depth: Depth): Supersaturation {
        const pSurf = surfacePressure / 1000.0;
        const pAmb = pSurf + depth.asMeters() / 10.0;
        const mValue = this.mValueRaw;
        const mValueSurf = this.mValue(Depth.zero(), surfacePressure, 100);
        const gf99 = ((this.totalIp - pAmb) / (mValue - pAmb)) * 100.0;
        const gfSurf = ((this.totalIp - pSurf) / (mValueSurf - pSurf)) * 100.0;

        return { gf99, gfSurf };
    }

    private mValue(
        depth: Depth,
        surfacePressure: number,
        maxGf: number
    ): Pressure {
        const weightedZhlParams = this.weightedZhlParams(this.heIp, this.n2Ip);
        const [, aCoeffAdjusted, bCoeffAdjusted] = this.maxGfAdjustedZhlParams(
            weightedZhlParams,
            maxGf
        );
        const pSurf = surfacePressure / 1000.0;
        const pAmb = pSurf + depth.asMeters() / 10.0;

        return aCoeffAdjusted + pAmb / bCoeffAdjusted;
    }

    // Tissue inert gases pressure after record
    private compartmentInertPressure(
        record: RecordData,
        surfacePressure: number
    ): [Pressure, Pressure] {
        const { depth, time, gas } = record;
        const partialPressures = gas.inspiredPartialPressures(
            depth,
            surfacePressure
        );

        // Partial pressure of inert gases in inspired gas (adjusted alveoli water vapor pressure)
        const heInspiredPp = partialPressures.he;
        const n2Inspired = partialPressures.n2;

        // Tissue saturation pressure change for inert gases
        const hePCompDelta = this.compartmentPressureDeltaHaldane(
            'helium',
            heInspiredPp,
            time,
            this.params.heht
        );
        const n2PCompDelta = this.compartmentPressureDeltaHaldane(
            'nitrogen',
            n2Inspired,
            time,
            this.params.n2ht
        );

        // Inert gases pressures after applying delta P
        const heFinal = this.heIp + hePCompDelta;
        const n2Final = this.n2Ip + n2PCompDelta;

        return [heFinal, n2Final];
    }

    // Compartment pressure change for inert gas (Haldane equation)
    private compartmentPressureDeltaHaldane(
        inertGas: 'helium' | 'nitrogen',
        gasInspiredP: Pressure,
        time: Time,
        halfTime: number
    ): Pressure {
        const inertGasLoad = inertGas === 'helium' ? this.heIp : this.n2Ip;

        // (Pi - Po)(1 - e^(-0.693t/half-time))
        const factor = 1.0 - Math.pow(2.0, -time.asMinutes() / halfTime);

        return (gasInspiredP - inertGasLoad) * factor;
    }

    // Tissue tolerable ambient pressure using GF slope, weighted Buhlmann ZHL params based on tissue inert gases saturation proportions
    private minTolerableAmbPressureCalc(maxGf: number): Pressure {
        const weightedZhlParams = this.weightedZhlParams(this.heIp, this.n2Ip);
        const [, aCoefficientAdjusted, bCoefficientAdjusted] =
            this.maxGfAdjustedZhlParams(weightedZhlParams, maxGf);

        return (this.totalIp - aCoefficientAdjusted) * bCoefficientAdjusted;
    }

    // Weighted ZHL params (half time, a coefficient, b coefficient) based on N2 and He params and inert gases proportions in tissue
    weightedZhlParams(
        hePp: Pressure,
        n2Pp: Pressure
    ): [number, number, number] {
        const weightedParam = (
            heParam: number,
            hePp: Pressure,
            n2Param: number,
            n2Pp: Pressure
        ): number => {
            return (heParam * hePp + n2Param * n2Pp) / (hePp + n2Pp);
        };

        return [
            weightedParam(this.params.heht, hePp, this.params.n2ht, n2Pp),
            weightedParam(this.params.hea, hePp, this.params.n2a, n2Pp),
            weightedParam(this.params.heb, hePp, this.params.n2b, n2Pp),
        ];
    }

    // Adjust zhl params based on max gf
    private maxGfAdjustedZhlParams(
        params: [number, number, number],
        maxGf: number
    ): [number, number, number] {
        const [halfTime, aCoeff, bCoeff] = params;
        const maxGfFraction = maxGf / 100.0;
        const aCoefficientAdjusted = aCoeff * maxGfFraction;
        const bCoefficientAdjusted =
            bCoeff / (maxGfFraction - maxGfFraction * bCoeff + bCoeff);

        return [halfTime, aCoefficientAdjusted, bCoefficientAdjusted];
    }

    // Get current tissue pressures
    get tissurePressures(): { n2: Pressure; he: Pressure; total: Pressure } {
        return {
            n2: this.n2Ip,
            he: this.heIp,
            total: this.totalIp,
        };
    }

    zhlParams(): ZHLParams {
        return this.params;
    }

    // Clone compartment for simulation purposes
    clone(): Compartment {
        const cloned = new Compartment(this.no, this.params, this.modelConfig);
        cloned.n2Ip = this.n2Ip;
        cloned.heIp = this.heIp;
        cloned.totalIp = this.totalIp;
        cloned.mValueRaw = this.mValueRaw;
        cloned.mValueCalc = this.mValueCalc;
        cloned.minTolerableAmbPressure = this.minTolerableAmbPressure;
        return cloned;
    }
}
