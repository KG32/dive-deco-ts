// ZH-L16C decompression parameters
// Based on Bühlmann ZH-L16C algorithm with 16A He values

export interface ZHLParams {
    // Nitrogen
    n2a: number; // a coefficient for nitrogen
    n2b: number; // b coefficient for nitrogen
    n2ht: number; // half-time for nitrogen (minutes)

    // Helium
    hea: number; // a coefficient for helium
    heb: number; // b coefficient for helium
    heht: number; // half-time for helium (minutes)
}

// ZH-L16C N2 and 16A He values
export const ZHL_16C_N2_16A_HE_VALUES: ZHLParams[] = [
    // Compartment 1
    {
        n2a: 1.2599,
        n2b: 0.505,
        n2ht: 4.0,
        hea: 1.7424,
        heb: 0.4245,
        heht: 1.51,
    },
    // Compartment 2
    { n2a: 1.0, n2b: 0.6514, n2ht: 8.0, hea: 1.383, heb: 0.5747, heht: 3.02 },
    // Compartment 3
    {
        n2a: 0.8618,
        n2b: 0.7222,
        n2ht: 12.5,
        hea: 1.1919,
        heb: 0.6527,
        heht: 4.72,
    },
    // Compartment 4
    {
        n2a: 0.7562,
        n2b: 0.7825,
        n2ht: 18.5,
        hea: 1.0458,
        heb: 0.7223,
        heht: 6.99,
    },
    // Compartment 5
    {
        n2a: 0.62,
        n2b: 0.8126,
        n2ht: 27.0,
        hea: 0.922,
        heb: 0.7582,
        heht: 10.21,
    },
    // Compartment 6
    {
        n2a: 0.5043,
        n2b: 0.8434,
        n2ht: 38.3,
        hea: 0.8205,
        heb: 0.7957,
        heht: 14.48,
    },
    // Compartment 7
    {
        n2a: 0.441,
        n2b: 0.8693,
        n2ht: 54.3,
        hea: 0.7305,
        heb: 0.8279,
        heht: 20.53,
    },
    // Compartment 8
    { n2a: 0.4, n2b: 0.891, n2ht: 77.0, hea: 0.6502, heb: 0.8553, heht: 29.11 },
    // Compartment 9
    {
        n2a: 0.375,
        n2b: 0.9092,
        n2ht: 109.0,
        hea: 0.595,
        heb: 0.8757,
        heht: 41.2,
    },
    // Compartment 10
    {
        n2a: 0.35,
        n2b: 0.9222,
        n2ht: 146.0,
        hea: 0.5545,
        heb: 0.8903,
        heht: 55.19,
    },
    // Compartment 11
    {
        n2a: 0.3295,
        n2b: 0.9319,
        n2ht: 187.0,
        hea: 0.5333,
        heb: 0.8997,
        heht: 70.69,
    },
    // Compartment 12
    {
        n2a: 0.3065,
        n2b: 0.9403,
        n2ht: 239.0,
        hea: 0.5189,
        heb: 0.9073,
        heht: 90.34,
    },
    // Compartment 13
    {
        n2a: 0.2835,
        n2b: 0.9477,
        n2ht: 305.0,
        hea: 0.5181,
        heb: 0.9122,
        heht: 115.29,
    },
    // Compartment 14
    {
        n2a: 0.261,
        n2b: 0.9544,
        n2ht: 390.0,
        hea: 0.5176,
        heb: 0.9171,
        heht: 147.42,
    },
    // Compartment 15
    {
        n2a: 0.248,
        n2b: 0.9602,
        n2ht: 498.0,
        hea: 0.5172,
        heb: 0.9217,
        heht: 188.24,
    },
    // Compartment 16
    {
        n2a: 0.2327,
        n2b: 0.9653,
        n2ht: 635.0,
        hea: 0.5119,
        heb: 0.9267,
        heht: 240.03,
    },
];
