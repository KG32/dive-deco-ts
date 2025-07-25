import { Cns, Otu, Pressure } from './types';
import { Time } from './time';

// CNS coefficients table (PO2 range, slope, intercept)
interface CNSCoeffRow {
    range: [number, number];
    slope: number;
    intercept: number;
}

const CNS_COEFFICIENTS: CNSCoeffRow[] = [
    { range: [0.5, 0.6], slope: -1800, intercept: 1800 },
    { range: [0.6, 0.7], slope: -1500, intercept: 1620 },
    { range: [0.7, 0.8], slope: -1200, intercept: 1410 },
    { range: [0.8, 0.9], slope: -900, intercept: 1170 },
    { range: [0.9, 1.1], slope: -600, intercept: 900 },
    { range: [1.1, 1.5], slope: -300, intercept: 570 },
    { range: [1.5, 1.65], slope: -750, intercept: 1245 },
];

export class OxTox {
    private cnsValue: Cns;
    private otuValue: Otu;

    constructor(cns: Cns = 0, otu: Otu = 0) {
        this.cnsValue = cns;
        this.otuValue = otu;
    }

    static default(): OxTox {
        return new OxTox(0, 0);
    }

    get cns(): Cns {
        return this.cnsValue;
    }

    get otu(): Otu {
        return this.otuValue;
    }

    addExposure(ppO2: Pressure, time: Time): void {
        // CNS calculation using NOAA coefficients
        const cnsRate = this.getCnsRate(ppO2);
        if (cnsRate > 0) {
            this.cnsValue += time.asMinutes() / cnsRate;
        }

        // OTU calculation
        if (ppO2 > 0.5) {
            const otuRate = Math.pow((ppO2 - 0.5) / 0.5, 0.83);
            this.otuValue += otuRate * time.asMinutes();
        }
    }

    private getCnsRate(ppO2: Pressure): number {
        // Find the appropriate coefficient row
        for (const coeff of CNS_COEFFICIENTS) {
            if (ppO2 >= coeff.range[0] && ppO2 <= coeff.range[1]) {
                // Calculate rate using linear equation: rate = slope * ppO2 + intercept
                return coeff.slope * ppO2 + coeff.intercept;
            }
        }

        // If ppO2 is below 0.5, no CNS accumulation
        if (ppO2 < 0.5) {
            return 0;
        }

        // If ppO2 is above 1.65, use the last coefficient
        if (ppO2 > 1.65) {
            const lastCoeff = CNS_COEFFICIENTS[CNS_COEFFICIENTS.length - 1];
            return lastCoeff.slope * ppO2 + lastCoeff.intercept;
        }

        return 0;
    }

    clone(): OxTox {
        return new OxTox(this.cnsValue, this.otuValue);
    }
}
