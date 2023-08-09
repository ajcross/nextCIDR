
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';



class IP {
	constructor(ip, prefix) {
		this.ip = ip;
	}
	toString() {
		var j = this.ip;
		var s = "";
		for (var i=3;i>=0;i--) {
			var k 
			k = Math.floor(j / (2**(8*i)));
			j = j % (2**(8*i));
 			s += k;
			if(i>0)
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
		else if (this.ip >= 2**32) {
			throw (new Error("IP address out of range"));
		}
		else if (this.ip % 2**(32-this.prefix) !== 0) {
			// Invalid prefix for this IP
			// 1. find a valid prefix for this ip
			var validprefix;

			for (var p = parseInt(this.prefix)+1; p <= 32; p++) {
				if (this.ip % 2**(32-p) ===0 ) {
					validprefix= new CIDR(this.ip,p);
					break;
				}
			}
			// 2. find a valid ip for the prefix
			var validip = validprefix.supernet(this.prefix);
			throw (new Error("Invalid prefix for this IP. Alternative CIDRs: "+validip.toString()+" or "+validprefix.toString()));
		}
	}
	toString() {
		var ip = new IP(this.ip)
		var s = ip.toString();
		s += "/"+this.prefix;
		return s;
	}
	static mask(n) {
		return (2 ** n -1)* 2 ** (32-n);
	}
	static parse (s) {
		const regex = new RegExp("^"+CIDR.ipv4+"/"+CIDR.prefix+"$");
		const valid = regex.test(s);
		if (valid) {
  			const octets = s.split(/[./]/);
  			const prefix = octets.pop();
			
			var ip = 0;
			for (var i=0;i<4;i++) {
				ip += parseInt(octets[3-i],10) * 2 ** (8*i);
			}
			return new CIDR(ip,prefix);
		}
		else {
			throw(new Error("Invalid CIDR syntax. Use a.b.c.d/n"));
		}
	}
	supernet(n) {
		var mod = this.ip % 2**(32-n);
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
		const d = 2**(32-n);
		for (var i=0;i<2**(n-this.prefix);i++) {
			snets.push(new CIDR(this.ip+d*i,n));
		}
		return snets;
	}
	next(n) {
		if (this.prefix > n) {
			return this.supernet(n).next(n);
		}
		else {
			const d = 2**(32-this.prefix);
			return new CIDR(this.ip+d,n);
		}
	}
	ipCount() {
		return 2**(32-this.prefix)
	}
	broadcast() {
		const d = 2**(32-this.prefix);
		return new IP(this.ip+d-1);
	}
	static diff(cidr1, cidr2) {
		if (cidr1.ip >= cidr2.ip) {
			return []
		}
		else {
		   var n = null;
		   var s = cidr1.next(cidr1.prefix);
		   for (var i=cidr1.prefix-1;i>=0;i--) {
			   if (cidr1.isSupernet(s) || cidr2.isSupernet(s)) 
				   break;
			   n = s;
			   s = n.supernet(i);
		   }
		   if (n == null) {
			   return [];
		   }
		   else {
			   return [n].concat(CIDR.diff(n,cidr2))
	           }
		}
	}
	static available(cidrs) {
		var avail=[];
		for(var i=0;i<cidrs.length-1;i++) {
			avail=avail.concat(CIDR.diff(cidrs[i],cidrs[i+1]));
		}
		return avail;
	}
}
class Prefixes {
	constructor (prefixes) {
		this.prefixes = prefixes;
	}
	parse(s) {
		const regex = new RegExp("^[0-9]+(\\*[0-9]+)?$");
		var pres = s.split(/[ ,]+/);
		this.prefixes = [];
		for (var i=0; i< pres.length; i++) {
			if (pres[i]!=="") {
				const valid = regex.test(pres[i]);
				if (!valid) {
					throw(new Error("Invalid prefix: "+pres[i]));;
				}
				const press = pres[i].split("*");
				const p = parseInt(press[0],10);
				var mul = 1;
				if (p > 32 || p <0) {
					throw(new Error("Invalid prefix value, must be between 0 and 32"));
				}
				if (press.length === 2)
					mul = parseInt(press[1],10);
				for (var j=0; j<mul; j++) {
					this.prefixes.push(p);
				}
			}
		}
	}
}
class CIDRForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			"cidr": "10.0.0.0/22",
			"prefixes": "28*3, 26, 24, 23",
		        "type": "supernet"};
		this.handleChange = this.handleChange.bind(this);
	}
	handleChange(event) {
		this.setState({[event.target.name]: event.target.value});
  	}
	copyCodeToClipboard = (resulttext) => {
		navigator.clipboard.writeText(resulttext);
  	}
        renderForm(cidr, cidrerror, prefixes, prefixeserror) {
		return (
		<div>
        		<div className="mb-2">
			<div className="form-check form-check-inline mb-2">
			        <input type="radio" 
			               value="first" 
			               id="first"
			               className="form-check-input"
			               checked={this.state.type === "first"} 
			               onChange={this.handleChange} 
			               name="type" />
		                <label htmlFor="first" className="form-check-label">
			               start after
			        </label>
			</div>
			<div className="form-check form-check-inline">
			        <input type="radio" 
			               value="supernet" 
			               id="supernet"
			               className="form-check-input"
			               checked={this.state.type === "supernet"} 
                                       onChange={this.handleChange} 
			               name="type" />
		                <label htmlFor="supernet" className="form-check-label">
			               supernet
			        </label>
			</div>
			<div>
          			<input id="cidr" 
				       className="form-control" 
				       type="text" 
				       name="cidr" 
				       value={this.state.cidr} 
				       onChange={this.handleChange} 
		  	 	       autoComplete="off" />
	                	<div className="text-danger">{cidrerror}</div>
			</div> </div>
        		<div className="mb-3">
				<label htmlFor="prefixes" className="form-label">
					Prefixes for next CIDRs:
				</label>
          			<input id="prefixes" 
		                       className="form-control" 
		                       type="text" 
		                       name="prefixes" 
		                       value={this.state.prefixes} 
		                       onChange={this.handleChange} 
		                       autoComplete="off"/>
	                	<div className="text-danger">{prefixeserror}</div>
			</div>
		</div>
		);
	}
	renderSquare(cidr,maxprefix, cols, ip0) {

		var pos = (cidr.ip-ip0.ip)/2**(32-maxprefix);
		var units = 2**(maxprefix-cidr.prefix);
		var w = (units-1)%cols+1;
	        var h = Math.floor(units/cols);
		var rowStart=Math.floor(pos/cols)+1;
		var rowEnd="span "+(h);
		var colStart=pos%cols+1;
		var colEnd="span "+(w);
                //console.log(cidr.toString()+ " pos "+ pos + " rowStart:"+rowStart+" rowEnd:"+rowEnd+" colStart: "+colStart+" colEnd: "+colEnd);
  		const renderTooltip = (props) => (
    			<Tooltip id="button-tooltip" {...props}>
				{cidr.type} {cidr.toString()}
                                <div>ip count: {cidr.ipCount().toString()}</div>
    			</Tooltip>
  		);

  		return (
    		<OverlayTrigger
			key={cidr.toString()}
      			placement="right"
      			delay={{ show: 150, hide: 100 }}
      			overlay={renderTooltip}
    		>
			<div
			  id={cidr.toString()}
			  className={cidr.type+' square'}
			  style={{
			        gridRowStart: rowStart,
			        gridRowEnd: rowEnd,
				gridColumnStart: colStart,
			        gridColumnEnd: colEnd,
			  }} />
    		</OverlayTrigger>
  		);
	}
	renderGrid(cidrsdict)  {
		var logCols = 5; //needs to be a power of 2

		var cols = 2**logCols;
                var cidrs =[];
		// join the cidrs in a single array adding a type 
		for (const [key, value] of Object.entries(cidrsdict)) {
			cidrs = cidrs.concat(value.map( (cidr) => {cidr.type=key; return cidr}));
		}

		if (cidrs.length===0) {
			return;
		}

                var maxprefix=cidrs.reduce((accumulador, cidr)=> Math.max(accumulador,cidr.prefix),0);
		var minip = cidrs.reduce((accumulador, cidr)=> Math.min(accumulador, cidr.ip),cidrs[0].ip);
		var ip0 = new CIDR(minip,32).supernet(maxprefix-logCols);

		var squares=cidrs.map( (cidr) => this.renderSquare(cidr, maxprefix, cols, ip0));
		return <div className='grid'>
			     {squares}</div> ;
	}

	renderResult(nextcidrs, resulterror)  {
		var results;
		var resultserror = <div className="text-danger">{resulterror}</div>;
		if (nextcidrs.length>0) {
			var nextcidrstxt="";
			var nextcidrslist = nextcidrs.map( (nextcidr) =>  (
				<li className="list-group-item" 
				    key={nextcidr.toString()}> {nextcidr.toString()} 
				  <div>broadcast: {nextcidr.broadcast().toString()}</div>
				  <div>ip count: {nextcidr.ipCount().toString()}</div>
				</li>)
			);
	        	nextcidrstxt=nextcidrs.reduce ( (s1, s2) => (s1+"\n"+ s2));
			
			var resultslist = 
       			<div className="mt-3">
				<label htmlFor="next" className="form-label">
					Subnets CIDR:
				</label>
				<ul className="list-group" id="next2"> {nextcidrslist}</ul>
			</div>;


			var copybutton = 
        		<div className="mt-1">
			        <button type="button" className="btn btn-outline-primary align-top" onClick={() => this.copyCodeToClipboard(nextcidrstxt)}>
                                   <i className="bi bi-clipboard align-top"></i> Copy
                                </button>
        		</div>;
			results = <div>{resultserror}{resultslist}{resultserror}{copybutton}</div>; 
		}
		else {
			results = <div>{resultserror}</div>;
		}
		return (<div>{results}</div>);
	}
  	render() {
		var cidr;
		var prefixes;
		var resulterror;
		var subnets=[];
		var outof=[];
		var freeoutof=[];
		var prefixeserror="";
		var cidrerror=null;
		var avail=[];
		var cidrs={};

		prefixes = new Prefixes();
		try {
			prefixes.parse(this.state.prefixes);
		}
		catch (e) {
			prefixeserror = e.message;
		}

		try {
		        cidr = CIDR.parse(this.state.cidr);
		}
		catch (e) {
			cidrerror = e.message;
		}
		if (!cidrerror && prefixes.prefixes.length > 0) {
			var i=0;
			var subnet=cidr;

			for (i=0; i<prefixes.prefixes.length; i++) {
				try {
					if (i===0 && this.state.type === "supernet") {
				    		subnet=new CIDR(cidr.ip, 32).supernet(prefixes.prefixes[0]);
					}
					else {
						subnet=subnet.next(prefixes.prefixes[i]);
					}
				} catch(e) {
					resulterror=e.message;
				}
				if (this.state.type === "supernet" && !subnet.isSupernet(cidr)) {
					outof.push(subnet);
				}
				else {
					subnets.push(subnet);
				}
			}
			if (outof.length >0 ) {
				// find a supernet big enought for all the subnets
				var bigenough;
				for (i=Math.min(cidr.prefix-1, outof[outof.length-1].prefix); i>=0; i--) {
					bigenough=outof[outof.length-1].supernet(i);
					if (cidr.isSupernet(bigenough)) {
						break;
					}
				}
				resulterror = "no space on supernet for all subnets. "+bigenough.toString() +" should be big enough";
			}
			if (subnets.length>0) {
				if (this.state.type === "first") {
			      		avail=avail.concat(CIDR.diff(cidr,subnets[0]));
				}
                        	for(var j=0;j<subnets.length-1;j++) {
                              		avail=avail.concat(CIDR.diff(subnets[j],subnets[j+1]));
                        	} 
				if (this.state.type === "supernet") {
			      		avail=avail.concat(CIDR.diff(subnets[subnets.length-1],cidr.next(32)));
				}
				if(outof.length>0) {
					freeoutof = CIDR.diff(cidr,outof[0]);
					for(j=0;j<outof.length-1;j++) {
						freeoutof=freeoutof.concat(CIDR.diff(outof[j],outof[j+1]));
					}
				}
			}
			cidrs = {"free": avail,
				 "free-out-of": freeoutof,
				 "subnet": subnets,
				 "out-of": outof,
				 "in-use": this.state.type==="first" ? [cidr] : []};
                } 
    		return (
			<div className="container">
			        <h1> 
			           <div className="align-top d-inline-block">
                                   <i className="bi bi-calculator"></i> 
			           </div> <div className="align-bottom pt-2 d-inline-block">CIDR calculator </div>
			        </h1>
				<p> Just a CIDR calculator </p>

				<p> Provide a first CIDR or a supernet and a list of subnet sizes (prefixes), the calculator will generate a list of subnet CIDRs</p>

<p> Runs on client, no server-side execution, no data transfer, and no cookies. </p>


				{this.renderForm(cidr,cidrerror,prefixes,prefixeserror)}
			        {this.renderGrid(cidrs)}
				{this.renderResult(subnets, resulterror)}
			</div>
    		);
  	}
}
// ========================================

ReactDOM.render(
  <CIDRForm />,
  document.getElementById('root')
);

