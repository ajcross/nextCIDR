import CIDR from './ipv4.js';

const PREFIX_TOKEN_REGEX = /^[0-9]+(\*[0-9]+)?$/;

export function parsePrefixes(text) {
    const parts = text.split(/[ ,]+/);
    const prefixes = [];

    for (const part of parts) {
        if (part !== '') {
            if (!PREFIX_TOKEN_REGEX.test(part)) {
                throw new Error(`Invalid prefix: ${part}`);
            }
            const [valueText, mulText] = part.split('*');
            const prefix = parseInt(valueText, 10);
            if (prefix > 32 || prefix < 0) {
                throw new Error('Invalid prefix value, must be between 0 and 32');
            }
            const mul = mulText ? parseInt(mulText, 10) : 1;
            for (let i = 0; i < mul; i++) {
                prefixes.push(prefix);
            }
        }
    }
    return prefixes;
}

export function doTheMath(cidrtxt, prefixestxt, type) {
    const subnets = [];
    const outof = [];
    let freeoutof = [];
    let prefixeserror = null;
    let resulterror = null;
    let cidrerror = null;
    let avail = [];
    let cidrs = {};
    let cidr;
    let prefixes = [];

    try {
        prefixes = parsePrefixes(prefixestxt);
    } catch (e) {
        prefixeserror = e.message;
    }

    try {
        cidr = CIDR.parse(cidrtxt);
    } catch (e) {
        cidrerror = e.message;
    }
    if (!cidrerror && prefixes.length > 0) {
        let subnet = cidr;
        try {
            for (let i = 0; i < prefixes.length; i++) {
                if (i === 0 && type === 'supernet') {
                    subnet = new CIDR(cidr.ip, 32).supernet(prefixes[0]);
                } else {
                    subnet = subnet.next(prefixes[i]);
                }
                if (type === 'supernet' && !cidr.containsSubnet(subnet)) {
                    outof.push(subnet);
                } else {
                    subnets.push(subnet);
                }
            }
            if (outof.length > 0) {
                // find a supernet big enought for all the subnets
                let bigenough;
                for (let i = Math.min(cidr.prefix - 1, outof[outof.length - 1].prefix); i >= 0; i--) {
                    bigenough = outof[outof.length - 1].supernet(i);
                    if (bigenough.containsSubnet(cidr)) {
                        break;
                    }
                }
                resulterror = `no room on supernet for all subnets. You need at least /${bigenough.prefix} prefix, for example ${bigenough.toString()}`;
            }
        } catch (e) {
            resulterror = e.message;
        }
        if (subnets.length > 0) {
            if (type === 'first') {
                avail = avail.concat(CIDR.diff(cidr, subnets[0]));
            }
            for (let j = 0; j < subnets.length - 1; j++) {
                avail = avail.concat(CIDR.diff(subnets[j], subnets[j + 1]));
            }
            if (type === 'supernet') {
                let next;
                try {
                    next = cidr.next(32);
                } catch (e) {
                    // next went out of range
                    next = null;
                }
                avail = avail.concat(CIDR.diff(subnets[subnets.length - 1], next));
            }
            if (outof.length > 0) {
                freeoutof = CIDR.diff(cidr, outof[0]);
                for (let j = 0; j < outof.length - 1; j++) {
                    freeoutof = freeoutof.concat(CIDR.diff(outof[j], outof[j + 1]));
                }
            }
        }
        cidrs = {
            free: avail,
            'free-out-of': freeoutof,
            subnet: subnets,
            'out-of': outof,
            'in-use': type === 'first' ? [cidr] : [],
        };
    }
    return [cidrs, cidrerror, prefixeserror, resulterror];
}
