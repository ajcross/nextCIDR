# nextCIDRs

Just a CIDR calculator

You need to provide a first CIDR and a list of subnet sizes (prefixes), the calculator will print the list of the CIDRs following the first one

<b>Tip:</b> if you want to partition a supernet in different subnets, introduce the supernet but setting the prefix to the first subnet, then introduce the rest of the prefixes. Let's say you have 10.0.0.0/16 and want to partition in 2 /24 and 2 /25. Introduce 10.0.0.0/24 as CIDR and 24, 25*2 as prefixes  

Runs on client, no server-side execution. 

# Run
This application is publicly available. Go to github pages or [here](https://ajcross.net/nextCIDR)

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
