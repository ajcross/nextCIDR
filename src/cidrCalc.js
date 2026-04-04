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
	let subnet0;
	let outof = false;
        let diff;
        try {
            for (let i = 0; i < prefixes.length; i++) {
                for (let j = 0; j < prefixes[i].times; j++) {
                    if (i === 0 && j === 0) {
                        if (prefixes[0].value < cidr.prefix) {
                            subnet = cidr.supernet(prefixes[0].value);
                        } else {
			    subnet = new CIDR(cidr.ip,prefixes[0].value);
			}
                        diff = CIDR.head(cidr, subnet);
                    } else {
                        subnet = subnet0.next(prefixes[i].value);
                        diff = CIDR.diff(subnet0, subnet);
                    }
		    // diff subnet subnet0 -> push con free o free out of
		    for (let k = 0; k < diff.length; k++) {   
                        if (cidr.containsSubnet(diff[k])) {
                            subnets.push({ cidr: diff[k],
			                   type: "free"});
                        } else {
                            subnets.push({ cidr: diff[k],
			                   type: "free-out-of"});
                        }
                    }
		    
                    if (cidr.containsSubnet(subnet)) {
                        subnets.push({ cidr: subnet,   
			               type: "subnet"});
                    } else {
			outof = true;
                        subnets.push({ cidr: subnet,
			               type: "out-of"});
                    }
		    subnet0 = subnet;
                }
            }
	    if (!outof) {
		let diff = CIDR.tail(cidr, subnet);
		
		for (let k = 0; k < diff.length; k++) {   
                    subnets.push({ cidr: diff[k],
			           type: "free"});
		}
	    }
            else {
                // find a supernet big enought for all the subnets
                let bigenough;
		const lastsubnet = subnets[subnets.length -1].cidr;
                for (let i = Math.min(cidr.prefix - 1, lastsubnet.prefix); i >= 0; i--) {
                    bigenough = lastsubnet.supernet(i);
                    if (bigenough.containsSubnet(cidr)) {
                        break;
                    }
                }
                resulterror = `no room on supernet for all subnets. You need at least /${bigenough.prefix} prefix, for example ${bigenough.toString()}`;
            }

	} catch (e) {
            resulterror = e.message;
	}
    }
return [subnets, cidrerror, prefixeserror, resulterror];
}
