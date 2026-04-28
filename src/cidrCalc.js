import CIDR from './ipv4.js';
import { parse } from './parser/subnetsParser.js'

export function parsePrefixes(text) {
    const ast = parse(text);
    return ast; 
}

export function doTheMath(cidrtxt, prefixestxt) {
    const subnets = [];
    let prefixeserror = null;
    let resulterror = null;
    let cidrerror = null;
    let network;
    let prefixes = [];
    let cidr;
    
    try {
        prefixes = parsePrefixes(prefixestxt);
    } catch (e) {
        prefixeserror = e.message;
    }

    try {
        network = CIDR.parse(cidrtxt);
    } catch (e) {
        cidrerror = e.message;
    }
    if (!cidrerror && prefixes.length > 0) {

        let subnet = network;
	let subnet0 = null;
	let outof = false;
        let diff;
	let type;
	   
        try {
            for (let i = 0; i < prefixes.length; i++) {
		let times=1;
		if (prefixes[i].times !== undefined)
		    times = prefixes[i].times;
	    	    
                for (let j = 0; j < times; j++) {
                    if (i === 0 && j === 0) {
			if (prefixes[0].type === "cidr") {
			    subnet = cidr = CIDR.parse(prefixes[0].value);
			} else {
			    if (prefixes[0].value < network.prefix) {
				subnet = network.supernet(prefixes[0].value);
                            } else {
				subnet = new CIDR(network.ip , prefixes[0].value);
			    }
			}
                        diff = CIDR.head(network, subnet);
                    } else {
			if (prefixes[i].type === "cidr") {
			    cidr = CIDR.parse(prefixes[i].value);
			    if ( !CIDR.gt (cidr, subnet0)) {
				subnet = subnet0.next(cidr.prefix);
			    }
			    else {
				subnet = cidr;
			    }
			}
			else {
			    subnet = subnet0.next(prefixes[i].value);
			}
                        diff = CIDR.diff(subnet0, subnet);
		    }
		    for (let k = 0; k < diff.length; k++) {
                        if (network.containsSubnet(diff[k])) {
			    type = "free";
			}
			else {
			    type = "free-out-of";
			}
                        subnets.push({ cidr: diff[k],
			               type: type});
                    }
		    
		    if (prefixes[i].type === "cidr") {
			if ( cidr !== subnet ) { //!CIDR.equals(cidr, subnet) ) {
			    type = "relocated";
			    resulterror = `unable to place ${cidr.toString()}, relocated to ${subnet.toString()}`;
			} else if (!network.containsSubnet(subnet)) {
			    outof = true;
			    type = "static-out-of";
			} else {
			    type = "static";
			}
		    }
		    else {
			if (network.containsSubnet(subnet)) {
			    type = "subnet";
			}
			else {
			    outof = true;
			    type = "out-of";
			}
		    }

                    subnets.push({ cidr: subnet,   
                                   type: type,
                                   ...(prefixes[i].label !== undefined && { label: prefixes[i].label })
                                });

		    subnet0 = subnet;
                }
            }
	    if (!outof) {
		let diff = CIDR.tail(network, subnet);
		
		for (let k = 0; k < diff.length; k++) {   
                    subnets.push({ cidr: diff[k],
			           type: "free"});
		}
	    }
            else if ( resulterror === null ) { // no error so far
		// find a supernet big enought for all the subnets
                let bigenough;
                const lastsubnet = subnets[subnets.length -1].cidr;
                for (let i = Math.min(network.prefix - 1, lastsubnet.prefix); i >= 0; i--) {
                    bigenough = lastsubnet.supernet(i);
                    if (bigenough.containsSubnet(network)) {
                        break;
                    }
                }
                resulterror = `no room on supernet for all subnets. You need at least /${bigenough.prefix} prefix, for example ${bigenough.toString()}`;
            }
	} catch (e) {
	    console.log(e)
            resulterror = e.message;
	}
    }
return [subnets, cidrerror, prefixeserror, resulterror];
}
