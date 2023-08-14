
function logBase(x, y) {
    return Math.log(y) / Math.log(x);
}

class IP {
    constructor(ip, prefix) {
        this.ip = ip;
    }
    toString() {
        var j = this.ip;
        var s = "";
        for (var i = 3; i >= 0; i--) {
            var k
            k = Math.floor(j / (2 ** (8 * i)));
            j = j % (2 ** (8 * i));
            s += k;
            if (i > 0)
                s += ".";
        }
        return s;
    }


}


class CIDR {
    static ipv4 = '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))';
    static prefix = '(?:3[0-2]|[0-2]?[0-9])';

    constructor(ip, prefix) {
        this.ip = ip;
        this.prefix = prefix;

        if (this.prefix < 0 || this.prefix > 32)
            throw (new Error("invalid prefix, must be between 0 and 32"));
        else if (this.ip >= 2 ** 32) {
            throw (new Error("IP address out of range"));
        } else if (this.ip % 2 ** (32 - this.prefix) !== 0) {
            // Invalid prefix for this IP
            // 1. find a valid prefix for this ip
            var validprefix;

            for (var p = parseInt(this.prefix) + 1; p <= 32; p++) {
                if (this.ip % 2 ** (32 - p) === 0) {
                    validprefix = new CIDR(this.ip, p);
                    break;
                }
            }
            // 2. find a valid ip for the prefix
            var validip = validprefix.supernet(this.prefix);
            throw (new Error("Invalid prefix for this IP. Alternative CIDRs: " + validip.toString() + " or " + validprefix.toString()));
        }
    }
    toString() {
        var ip = new IP(this.ip)
        var s = ip.toString();
        s += "/" + this.prefix;
        return s;
    }
    static mask(n) {
        return (2 ** n - 1) * 2 ** (32 - n);
    }
    static parse(s) {
        const regex = new RegExp("^" + CIDR.ipv4 + "/" + CIDR.prefix + "$");
        const valid = regex.test(s);
        if (valid) {
            const octets = s.split(/[./]/);
            const prefix = octets.pop();

            var ip = 0;
            for (var i = 0; i < 4; i++) {
                ip += parseInt(octets[3 - i], 10) * 2 ** (8 * i);
            }
            return new CIDR(ip, prefix);
        } else {
            throw (new Error("Invalid CIDR syntax. Use a.b.c.d/n"));
        }
    }
    supernet(n) {
        var mod = this.ip % 2 ** (32 - n);
        return new CIDR(this.ip - mod, n);
    }
    isSupernet(supercidr) {
        if (supercidr.prefix > this.prefix) {
            return false;
        }
        var s = this.supernet(supercidr.prefix);
        return (s.ip === supercidr.ip);
    }
    subnets(n) {
        var snets = [];
        const d = 2 ** (32 - n);
        for (var i = 0; i < 2 ** (n - this.prefix); i++) {
            snets.push(new CIDR(this.ip + d * i, n));
        }
        return snets;
    }
    next(n) {
        if (this.prefix > n) {
            return this.supernet(n).next(n);
        } else {
            const d = 2 ** (32 - this.prefix);
            return new CIDR(this.ip + d, n);
        }
    }
    ipCount() {
        return 2 ** (32 - this.prefix)
    }
    broadcast() {
        const d = 2 ** (32 - this.prefix);
        return new IP(this.ip + d - 1);
    }
    static diff(cidr1, cidr2) {
        try {
            var ip1 = cidr1.next(32).ip;
        } catch (e) {
            return [];
        } 
        var ip2;
        if (cidr2===null)
            ip2 = 2**32;
        else
            ip2 = cidr2.ip;

        if (ip1 >= ip2) {
            return []
        } else {
            var n = [];
            var lb = Math.floor(logBase(2, ip2 - ip1));
            while (lb > 0) {
                ip2 = ip2 - 2 ** lb;
                n.push(new CIDR(ip2, 32 - lb));
                lb = Math.floor(logBase(2, ip2 - ip1));
            }
            return n;
        }
    }
}

export default CIDR;
