
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class CIDR {
	static ipv4 = '(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))';
	static prefix = '(?:3[0-2]|[0-2]?[0-9])';

	constructor(ip, prefix) {
		this.ip = ip;
		this.prefix = prefix;
		this.errormsg = false;

		if (this.prefix < 0 || this.prefix > 32) 
			this.errormsg="invalid prefix, must be between 0 and 32";
		else if (this.ip >= 2**32) {
			this.errormsg="IP address out of range";
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
			this.errormsg="Invalid prefix for this IP. Alternative CIDRs: "+validip.toString()+" or "+validprefix.toString();
		}
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
			var cidr = new CIDR(ip,prefix);
			if (cidr.error()) 
				return cidr.error();
			else
				return cidr;
		}
		else {
			return "Invalid CIDR syntax. Use a.b.c.d/n";
		}
	}
	error() {
		return this.errormsg;
	}
	supernet(n) {
		var mod = this.ip % 2**(32-n);
		return new CIDR(this.ip - mod, n);
	}
	isSupernet(supercidr) {
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
}
class Prefixes {
	constructor (prefixes) {
		this.prefixes = prefixes;
		this.errormsg=false;
	}
	parse(s) {
		const regex = new RegExp("^[0-9]+(\\*[0-9]+)?$");
		var pres = s.split(/[ ,]+/);
		this.prefixes = [];
		for (var i=0; i< pres.length; i++) {
			if (pres[i]!=="") {
				const valid = regex.test(pres[i]);
				if (!valid) {
					this.errormsg="Invalid prefix: "+pres[i];
					break;
				}
				const press = pres[i].split("*");
				const p = parseInt(press[0],10);
				var mul = 1;
				if (p > 32 || p <0) {
					this.errormsg="Invalid prefix value, must be between 0 and 32";
					break;
				}
				if (press.length === 2)
					mul = parseInt(press[1],10);
				for (var j=0; j<mul; j++) {
					this.prefixes.push(p);
				}
			}
		}
	}
	error() {
		return this.errormsg;
	}
}
class CIDRForm extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			"cidr": "10.0.0.0/16",
			"prefixes": "28*2, 26, 24",
		        "type": "first"};
		this.handleChange = this.handleChange.bind(this);
	}
	handleChange(event) {
		this.setState({[event.target.name]: event.target.value});
  	}
	copyCodeToClipboard = (resulttext) => {
		navigator.clipboard.writeText(resulttext);
  	}
        renderForm(cidr, prefixes) {
		var cidrerror;
		if (typeof cidr === "string") {
			cidrerror=cidr;
		}
		var prefixeserror="";
		if (prefixes.error()) {
			prefixeserror=prefixes.error();
		}
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
			               first
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
			</div>
			</div>
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
	renderResult(nextcidrs, resulterror)  {
		var results;
		var resultserror = <div className="text-danger">{resulterror}</div>;
		if (nextcidrs.length>0) {
			var nextcidrstxt="";
			var nextcidrslist = nextcidrs.map( (nextcidr) =>  {return (<li className="list-group-item" key={nextcidr.toString()}> {nextcidr.toString()} </li>);});
			if (nextcidrs.length) {
	        		nextcidrstxt=nextcidrs.reduce ( (s1, s2) => {return (s1+"\n"+ s2)});
			}
			var resultslist = 
       			<div className="mt-3">
				<label htmlFor="next" className="form-label">
					Subnets CIDR:
				</label>
				<ul className="list-group" id="next"> {nextcidrslist}</ul>
			</div>;


			var copybutton = 
        		<div className="mt-1">
			        <button type="button" className="btn btn-outline-primary align-top" onClick={() => this.copyCodeToClipboard(nextcidrstxt)}>
                                   <i className="bi bi-clipboard align-top"></i> Copy
                                </button>
        		</div>;
			results = <div>{resultslist}{resultserror}{copybutton}</div>; 
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
		var nextcidrs=[];

		cidr = CIDR.parse(this.state.cidr);
		var supernet = CIDR.parse("0.0.0.0/0");
		prefixes = new Prefixes();
		prefixes.parse(this.state.prefixes);

		if (typeof cidr !== "string" && prefixes.prefixes.length > 0) {
			var i=0;
			if (this.state.type === "supernet") {
				supernet = cidr;
				cidr=new CIDR(cidr.ip, prefixes.prefixes[0]);
				if (!cidr.error()) {
					nextcidrs.push(cidr);
				}
				else {
					resulterror=cidr.error();
				}
				i=1;
			}
			for (; i<prefixes.prefixes.length; i++) {
				cidr=cidr.next(prefixes.prefixes[i]);
				if (!cidr.error()) {
					if (!cidr.isSupernet(supernet)) {
						resulterror = "no space on supernet for more subnets";
						break;
					}
					nextcidrs.push(cidr);
				}
				else {
					resulterror=cidr.error();
				}
			}
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

<p> Runs on client, no server-side execution. </p>


				{this.renderForm(cidr,prefixes)}
				{this.renderResult(nextcidrs, resulterror)}
			</div>
    		);
  	}
}
// ========================================

ReactDOM.render(
  <CIDRForm />,
  document.getElementById('root')
);

