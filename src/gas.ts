import { Pressure, MbarPressure, PartialPressures } from './types';
import { Depth } from './depth';

// Alveolar water vapor pressure assuming 47 mm Hg at 37C (Buhlmann's value)
const ALVEOLI_WATER_VAPOR_PRESSURE = 0.0627;

export class Gas {
    private o2Pp: Pressure;
    private n2Pp: Pressure;
    private hePp: Pressure;

    constructor(o2Pp: Pressure, hePp: Pressure) {
        if (o2Pp < 0 || o2Pp > 1) {
            throw new Error('Invalid O2 partial pressure');
        }
        if (hePp < 0 || hePp > 1) {
            throw new Error(`Invalid He partial pressure [${hePp}]`);
        }
        if (o2Pp + hePp > 1) {
            throw new Error(
                "Invalid partial pressures, can't exceed 1ATA in total"
            );
        }

        this.o2Pp = o2Pp;
        this.hePp = hePp;
        this.n2Pp = Math.round((1 - (o2Pp + hePp)) * 10000) / 10000;
    }

    static air(): Gas {
        return new Gas(0.21, 0);
    }

    get o2(): Pressure {
        return this.o2Pp;
    }

    get n2(): Pressure {
        return this.n2Pp;
    }

    get he(): Pressure {
        return this.hePp;
    }

    id(): string {
        return `${Math.round(this.o2Pp * 100)}/${Math.round(this.hePp * 100)}`;
    }

    partialPressures(
        depth: Depth,
        surfacePressure: MbarPressure
    ): PartialPressures {
        const gasPressure = surfacePressure / 1000 + depth.asMeters() / 10;
        return this.gasPressuresCompound(gasPressure);
    }

    inspiredPartialPressures(
        depth: Depth,
        surfacePressure: MbarPressure
    ): PartialPressures {
        const gasPressure =
            surfacePressure / 1000 +
            depth.asMeters() / 10 -
            ALVEOLI_WATER_VAPOR_PRESSURE;
        return this.gasPressuresCompound(gasPressure);
    }

    private gasPressuresCompound(gasPressure: number): PartialPressures {
        return {
            o2: this.o2Pp * gasPressure,
            n2: this.n2Pp * gasPressure,
            he: this.hePp * gasPressure,
        };
    }

    maxOperatingDepth(ppO2Limit: Pressure): Depth {
        return Depth.fromMeters(10 * (ppO2Limit / this.o2Pp - 1));
    }

    equivalentNarcoticDepth(depth: Depth): Depth {
        let end = depth
            .add(Depth.fromMeters(10))
            .multiply(1 - this.hePp)
            .subtract(Depth.fromMeters(10));

        if (end.lessThan(Depth.zero())) {
            end = Depth.zero();
        }

        return end;
    }

    toString(): string {
        return `${Math.round(this.o2Pp * 100)}/${Math.round(this.hePp * 100)}`;
    }

    equals(other: Gas): boolean {
        return (
            this.o2Pp === other.o2Pp &&
            this.n2Pp === other.n2Pp &&
            this.hePp === other.hePp
        );
    }
}
