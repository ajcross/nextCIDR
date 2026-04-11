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
			    subnet = CIDR.parse(prefixes[0].value);
			} else {
			    if (prefixes[0].value < cidr.prefix) {
				subnet = cidr.supernet(prefixes[0].value);
                            } else {
				subnet = new CIDR(cidr.ip , prefixes[0].value);
			    }
			}
                        diff = CIDR.head(cidr, subnet);
                    } else {
			if (prefixes[i].type === "cidr") {
			    subnet = CIDR.parse(prefixes[i].value);
			}
			else {
                            subnet = subnet0.next(prefixes[i].value);
			}
                        diff = CIDR.diff(subnet0, subnet);
                    }
		    for (let k = 0; k < diff.length; k++) {
                        if (cidr.containsSubnet(diff[k])) {
			    type = "free";
			}
			else {
			    type = "free-out-of";
			}
                        subnets.push({ cidr: diff[k],
			               type: type});
                    }

		    if (prefixes[i].type === "cidr") {
			if (!cidr.containsSubnet(subnet)) {
			    outof = true;
			    type = "in-use-out-of";
			} else  if (subnet0 === null || CIDR.gt(subnet,subnet0)) {
			    type = "in-use";
			}
			else {
			    type = "out-of-order";
			    resulterror = `unable to place ${subnet.toString()} in the specified order.`;
			}
		    }
		    else {
			if (cidr.containsSubnet(subnet)) {
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
		let diff = CIDR.tail(cidr, subnet);
		
		for (let k = 0; k < diff.length; k++) {   
                    subnets.push({ cidr: diff[k],
			           type: "free"});
		}
	    }
            else if ( resulterror === null ) { // no error so far
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
	    console.log(e)
            resulterror = e.message;
	}
    }
return [subnets, cidrerror, prefixeserror, resulterror];
}
