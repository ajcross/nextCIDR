
class IP {
    constructor(ip, prefix) {
        this.ip = ip;
    }

    toString() {
        let j = this.ip;
        let s = '';
        for (let i = 3; i >= 0; i--) {
            let k;
            k = Math.floor(j / (2 ** (8 * i)));
            j = j % (2 ** (8 * i));
            s += k;
            if (i > 0) {
                s += '.';
            }
        }
        return s;
    }
}

class CIDR {
    static ipv4 = '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))';
    static prefix = '(?:3[0-2]|[0-2]?[0-9])';

    constructor(ip, prefix) {
        this.ip = ip;
        this.prefix = Number(prefix);

        if (this.prefix < 0 || this.prefix > 32) {
            throw (new Error('invalid prefix, must be between 0 and 32'));
        } else if (this.ip >= 2 ** 32) {
            throw (new Error('IP address out of range'));
        } else if (this.ip % 2 ** (32 - this.prefix) !== 0) {
            // Invalid prefix for this IP
            // 1. find a valid prefix for this ip
            let validprefix=new CIDR(this.ip,CIDR.minValidPrefix(this.ip))

            // 2. find a valid ip for the prefix
            const validip = validprefix.supernet(this.prefix);
            throw (new Error(`Invalid prefix for this IP. Alternative CIDRs: ${validip.toString()} or ${validprefix.toString()}`));
        }
    }
    static minValidPrefix(ip) {
        for (let prefix = 0; prefix <= 32; prefix++) {
            if (ip % 2 ** (32 - prefix) === 0) {
                return prefix
            }
        }
    }
    toString() {
        const ip = new IP(this.ip);
        let s = ip.toString();
        s += `/${this.prefix}`;
        return s;
    }

    static mask(n) {
        return (2 ** n - 1) * 2 ** (32 - n);
    }

    static parse(s) {
        const regex = new RegExp(`^${CIDR.ipv4}/${CIDR.prefix}$`);
        const valid = regex.test(s);
        if (valid) {
            const octets = s.split(/[./]/);
            const prefix = Number(octets.pop());

            let ip = 0;
            for (let i = 0; i < 4; i++) {
                ip += parseInt(octets[3 - i], 10) * 2 ** (8 * i);
            }
            return new CIDR(ip, prefix);
        }
        throw (new Error('Invalid CIDR syntax. Use a.b.c.d/n'));
    }

    supernet(n) {
        const mod = this.ip % 2 ** (32 - n);
        return new CIDR(this.ip - mod, n);
    }

    containsSubnet(subnet) {
        if (this.prefix > subnet.prefix) {
	    return false;
	}
	const s = subnet.supernet(this.prefix);
	return (s.ip === this.ip)
    }
    
    containsIP(ip) {
        return this.containsSubnet(new CIDR(ip, 32))
    }

    subnets(n) {
        const snets = [];
        const d = 2 ** (32 - n);
        for (let i = 0; i < 2 ** (n - this.prefix); i++) {
            snets.push(new CIDR(this.ip + d * i, n));
        }
        return snets;
    }

    next(n) {
        if (this.prefix > n) {
            return this.supernet(n).next(n);
        }
        const d = 2 ** (32 - this.prefix);
        return new CIDR(this.ip + d, n);
    }

    ipCount() {
        return 2 ** (32 - this.prefix);
    }

    broadcast() {
        const d = 2 ** (32 - this.prefix);
        return new IP(this.ip + d - 1);
    }

    static diff(cidr1, cidr2) {

        let ip1;
        if (cidr1 == null) {
            ip1 = 0;
        }
        else {
            try {
                ip1 = cidr1.next(32).ip;
            } catch (e) {
                return [];
            }
        }
        let ip2;

        if (cidr2 === null) {
            ip2 = 2 ** 32;
        } else {
            ip2 = cidr2.ip;
        }
        if (ip1 >= ip2) {
            return [];
        }
        const n = [];
	while (ip1 !== ip2) { 
	    let prefix = CIDR.minValidPrefix(ip1);
	    let cidr;
	    do {
                cidr = new CIDR(ip1,prefix);
	        prefix=prefix+1;
	    } while( cidr.containsIP(ip2));
	    n.push(cidr);
            ip1 = cidr.next(32).ip;
        }	
        return n;
    }
    static head(supernet, subnet) {
        let cidr1;
	if (supernet.ip === 0) {
            cidr1 = null;
        }
        else {
            cidr1 = new CIDR(supernet.ip-1,32) ;
        }
        return CIDR.diff(cidr1, subnet);
    }
    static tail(supernet, subnet) {
        let cidr2;
        if (supernet.ip + supernet.ipCount() === 2**32-1) {
            cidr2 = null;
	}
        else {
            cidr2 = supernet.next(32);
	}
        return CIDR.diff(subnet, cidr2);
    }

}

export default CIDR;
