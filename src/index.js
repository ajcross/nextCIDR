
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
			"prefixes": "28*2, 26, 24"};
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
        		<div className="form-group">
				<label htmlFor="cidr">
          				CIDR:
        			</label>
          			<input id="cidr" 
				       className="form-control" 
				       type="text" 
				       name="cidr" 
				       value={this.state.cidr} 
				       onChange={this.handleChange} 
		  	 	       autoComplete="off" />
	                	<div className="text-danger">{cidrerror}</div>
			</div>
        		<div className="form-group">
				<label htmlFor="prefixes">
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
       			<div>
				<label htmlFor="next">
					CIDRs:
				</label>
				<ul className="list-group" id="next"> {nextcidrslist}</ul>
			</div>;


			var copybutton = 
        		<div>
          			<button onClick={() => this.copyCodeToClipboard(nextcidrstxt)}>
            			Copy to Clipboard
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
		prefixes = new Prefixes();
		prefixes.parse(this.state.prefixes);

		if (typeof cidr !== "string") {
			for (var i=0; i<prefixes.prefixes.length; i++) {
				cidr=cidr.next(prefixes.prefixes[i]);
				if (!cidr.error()) {
					nextcidrs.push(cidr);
				}
				else {
					resulterror=cidr.error();
				}
			}
		}

    		return (
			<div className="container">
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

