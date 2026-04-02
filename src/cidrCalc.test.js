import { doTheMath, parsePrefixes } from './cidrCalc';

test('parsePrefixes expands multipliers', () => {
    expect(parsePrefixes('28*2, 26, 24')).toEqual([28, 28, 26, 24]);
});

test('parsePrefixes rejects invalid prefixes', () => {
    expect(() => parsePrefixes('33')).toThrow("Invalid prefix \"33\". Must be an integer between 0 and 32.");
});

test('doTheMath returns subnets for supernet mode', () => {
    const [cidrs, cidrerror, prefixeserror, resulterror] = doTheMath('10.0.0.0/24', '26', 'supernet');
    expect(cidrerror).toBeNull();
    expect(prefixeserror).toBeNull();
    expect(resulterror).toBeNull();
    expect(cidrs.subnet.map((c) => c.toString())).toEqual(['10.0.0.0/26']);
});

test('doTheMath surfaces CIDR parse errors', () => {
    const [, cidrerror] = doTheMath('10.0.0/24', '26', 'supernet');
    expect(cidrerror).toMatch('Invalid CIDR syntax');
});
