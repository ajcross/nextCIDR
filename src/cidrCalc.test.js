import { doTheMath, parsePrefixes } from './cidrCalc';

test('parsePrefixes expands multipliers', () => {
    expect(parsePrefixes('28*2, 26, 24')).toEqual( [
        {
            "times": 2,
            "type": "prefix",
            "value": "28",
        },
        {
            "times": 1,
            "type": "prefix",
            "value": "26",
        },
        {
            "times": 1,
            "type": "prefix",
            "value": "24",
        }])});


test('parsePrefixes rejects invalid prefixes', () => {
    expect(() => parsePrefixes('33')).toThrow("Invalid prefix \"33\". Must be an integer between 0 and 32.");
});

test('doTheMath return one subnet and two free', () => {
    const [subnets, cidrerror, prefixeserror, resulterror] = doTheMath('10.0.0.0/25', '26');
    expect(cidrerror).toBeNull();
    expect(prefixeserror).toBeNull();
    expect(resulterror).toBeNull();
    const r = subnets.map(u => ({
	"cidr": u.cidr.toString(),
	"type": u.type
    }));

    expect(r).toEqual([
	{ "cidr": "10.0.0.0/26",  "type": "subnet" },
	{ "cidr": "10.0.0.64/26", "type": "free" },
    ])});

test('doTheMath returns subnets and free', () => {
    const [subnets, cidrerror, prefixeserror, resulterror] = doTheMath('10.0.0.0/21', '28*3, 26, 24, 23');
    expect(cidrerror).toBeNull();
    expect(prefixeserror).toBeNull();
    expect(resulterror).toBeNull();
    const r = subnets.map(u => ({
	"cidr": u.cidr.toString(),
	"type": u.type
    }));

    expect(r).toEqual([
	{ "cidr": "10.0.0.0/28",  "type": "subnet" },
	{ "cidr": "10.0.0.16/28", "type": "subnet" },
	{ "cidr": "10.0.0.32/28", "type": "subnet" },
	{ "cidr": "10.0.0.48/28", "type": "free"   },
	{ "cidr": "10.0.0.64/26", "type": "subnet" },
	{ "cidr": "10.0.0.128/25","type": "free"   },
	{ "cidr": "10.0.1.0/24",  "type": "subnet" },
	{ "cidr": "10.0.2.0/23",  "type": "subnet" },
	{ "cidr": "10.0.4.0/22",  "type": "free"   }
    ]);
});

test('doTheMath return one subnet with label and two free', () => {
    const [subnets, cidrerror, prefixeserror, resulterror] = doTheMath('10.0.0.0/25', '26 "twentysix"');
    expect(cidrerror).toBeNull();
    expect(prefixeserror).toBeNull();
    expect(resulterror).toBeNull();
    const r = subnets.map(u => ({
	"cidr": u.cidr.toString(),
	"type": u.type,
	"label": u.label
    }));

    expect(r).toEqual([
	{ "cidr": "10.0.0.0/26",  "type": "subnet" ,"label": "twentysix"},
	{ "cidr": "10.0.0.64/26", "type": "free" },
    ])});


test('doTheMath surfaces CIDR parse errors', () => {
    const [, cidrerror] = doTheMath('10.0.0/24', '26');
    expect(cidrerror).toMatch('Invalid CIDR syntax');
});

test('doTheMath error, subnet is bigger than supernet', () => {
    const [subnets, cidrerror, prefixeserror, resulterror] = doTheMath('10.0.1.0/24', '1');
    expect(cidrerror).toBeNull();
    expect(prefixeserror).toBeNull();
    expect(resulterror).toMatch("no room on supernet for all subnets. You need at least /1 prefix, for example 0.0.0.0/1");
    const r = subnets.map(u => ({
	"cidr": u.cidr.toString(),
	"type": u.type
    }));

    expect(r).toEqual([
	{ "cidr": "0.0.0.0/1",  "type": "out-of" },
    ]);
});
