# nextCIDRs

Another CIDR calculator

Enter a network in CIDR format and a list of subnet sizes or CIDRs, the calculator will generate the list of subnets.

Subnets can be specified by:

* Size (prefix): using a number, with or without forward slash '/', e.g: /24
* Multiplier: adding a multiplier to specify multple subnets of the same size, e.gg: /28*3 for three /28 subnes
* Fixed subnet: using standard CIDR format, e.g: 172.23.10.0/24

A label can be added to each subnet using single or double quotes

The order of the subnets is respected, no reordering is done.

Runs on client, no server-side execution, no data transfer, and no cookies.

# Run & Test
This application is publicly available. Go to github pages or [here](https://ajcross.github.io/nextCIDR/)

# Setup
Developed using React

To build, install node and then run:
```sh
npm install
```

to test on the development server:
```sh
npm start
```

to build:
```sh
npm run build
```

to deploy on github pages
```sh
npm run deploy
```
