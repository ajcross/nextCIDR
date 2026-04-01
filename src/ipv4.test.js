import CIDR from './ipv4';

test('CIDR.parse parses valid CIDR', () => {
    const cidr = CIDR.parse('10.0.0.0/24');
    expect(cidr.toString()).toBe('10.0.0.0/24');
});

test('CIDR.parse rejects invalid CIDR', () => {
    expect(() => CIDR.parse('10.0.0/24')).toThrow('Invalid CIDR syntax');
});

test('CIDR.supernet returns correct supernet', () => {
    const cidr = CIDR.parse('10.0.1.0/24');
    expect(cidr.supernet(23).toString()).toBe('10.0.0.0/23');
});

test('CIDR.next returns next block', () => {
    const cidr = CIDR.parse('10.0.0.0/24');
    expect(cidr.next(24).toString()).toBe('10.0.1.0/24');
});

test('CIDR.broadcast returns last IP', () => {
    const cidr = CIDR.parse('10.0.0.0/24');
    expect(cidr.broadcast().toString()).toBe('10.0.0.255');
});

test('CIDR.diff returns range between CIDRs', () => {
    const cidr1 = CIDR.parse('10.0.0.0/24');
    const cidr2 = CIDR.parse('10.0.1.0/24');
    const diff = CIDR.diff(cidr1, cidr2);
    expect(diff).toEqual([])
    //expect(diff.map((d) => d.toString())).toEqual(['10.0.1.0/24']);
});

test('CIDR.diff returns range between CIDRs', () => {
    const cidr1 = CIDR.parse('10.0.1.0/32');
    const cidr2 = CIDR.parse('10.0.1.4/30');
    const diff = CIDR.diff(cidr1, cidr2).map(u => u.toString());
    expect(diff).toEqual(
        expect.arrayContaining([
          '10.0.1.1/32',
          '10.0.1.2/31',
        ])
    );
});

test('CIDR.diff returns range between CIDRs', () => {
    const cidr1 = CIDR.parse('10.0.1.0/24');
    const cidr2 = CIDR.parse('10.0.4.0/24');
    const diff = CIDR.diff(cidr1, cidr2).map(u => u.toString());
    expect(diff).toEqual(
        expect.arrayContaining([
          '10.0.2.0/23'
        ])
    );
});

test('CIDR.diff returns range between CIDRs', () => {
    const cidr1 = CIDR.parse('10.0.0.0/24');
    const cidr2 = CIDR.parse('10.0.3.0/24');
    const diff = CIDR.diff(cidr1, cidr2).map(u => u.toString());
    expect(diff).toEqual(
        expect.arrayContaining([
          '10.0.1.0/24',
          '10.0.2.0/24',
        ])
    );
});
test('CIDR.next returns a valid CIDR', () => {
    const cidr = CIDR.parse('10.0.1.0/32');
    const nextcidr = cidr.next(32);
    expect(nextcidr.toString()).toEqual('10.0.1.1/32');
});

describe('CIDR.next', () => {
    test.each([
	    [ 'same prefix',   '10.0.1.0/24' , 24, '10.0.2.0/24' ],
	    [ 'higher prefix', '10.0.1.0/24' , 25, '10.0.2.0/25' ],
	    [ 'lower prefix',  '10.0.0.32/28', 24, '10.0.1.0/24' ],
    ])('%s', (_name, cidr, prefix, expected) => {
        const incidr = CIDR.parse(cidr);
        const nextcidr = incidr.next(prefix);
        expect(nextcidr.toString()).toEqual(expected);
    });
});
