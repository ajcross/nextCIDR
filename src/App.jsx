import './App.css'
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Accordion from 'react-bootstrap/Accordion';
import CIDR from './ipv4.js'
import { doTheMath } from './cidrCalc.js'
import { useSearchParams } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { useEffect, useState } from "react";



function ErrorMessage({message}) {
    if (message) {
        return <Alert variant="danger"
                   className="mt-1">
                   {message}
                </Alert>;
    } else {
        return null;
    }
}

function CIDRErrorMessage({message, setNetwork}) {
    if (message) {
        const regex = new RegExp(CIDR.ipv4 + "/" + CIDR.prefix, "g");
        let result;
        let i = 0;
        let elements = [];
        while ((result = regex.exec(message)) !== null) {
            elements.push(message.substring(i, result.index));
            elements.push(
                <Alert.Link 
                    href='#' 
                    key={result[0]}
                    onClick={(e) => setNetwork(e.target.innerHTML)}> 
                    {result[0]}
                </Alert.Link>);
            i = regex.lastIndex;
        }
        elements.push(message.substring(i));
        return <Alert variant="danger"
                   className="mt-1">
                   {elements}
                </Alert>;
    } else {
        return null;
    }
}

function SubnetList({subnets}) {
    const types = [...new Set(subnets.map(item => item.type))];
    console.log(types);

    const [selected, setSelected] = useState(["subnet"]);
    const handleChange = (e) => {
	const { value, checked } = e.target;

	if (checked) {
	    setSelected((prev) => [...prev, value]);
	} else {
	    setSelected((prev) => prev.filter((item) => item !== value));
	}
    };


    let checks = <Form>
		     <div className="d-flex mt-3">
                     {types.map((type) => (

			 <Form.Check
			     className="ms-2"
                             type="checkbox"
                             label={type}
			     value={type}
			     checked={selected.includes(type)}
			     onChange={handleChange}
			 />))}
		     </div>
		 </Form>;
    subnets=subnets.filter((subnet) => selected.includes(subnet.type));
    if (subnets && subnets.length) {
        let results;
        let clipboardtxt = "";
        let subnetslist = subnets.map((subnet) => (
	    <Accordion.Item eventKey={subnet.cidr.toString()} className="compact-accordion">
		<Accordion.Header className="p-0">
		    <div className="d-flex">
			<div
			    className={subnet.type+" dot"}
			/>
			<div className="ms-2">
			    {subnet.cidr.toString()} {subnet.label}
			</div>
		    </div>
		</Accordion.Header>
		<Accordion.Body>
		    <div>broadcast: {subnet.cidr.broadcast().toString()}</div>
		    <div>netmask: {subnet.cidr.netmask().toString()}</div>
		    <div>ip count: {subnet.cidr.ipCount().toString()}</div>
		    
		</Accordion.Body>
	    </Accordion.Item>));
        clipboardtxt = subnets.reduce((s1, s2) => (`${s1}\n${s2.label ? `${s2.label}: `: ""}${s2.cidr.toString()}`),
				      clipboardtxt);

        let resultslist =
            <div className="mt-3">
		<Accordion alwaysOpen>{subnetslist}</Accordion>
            </div>;
        let copybutton =
            <Button  
                className="mt-1"
                variant="outline-primary"
                onClick={() => navigator.clipboard.writeText(clipboardtxt)}>
                <i className="bi bi-clipboard align-top"/> Copy
            </Button>;
        return <>{checks}{copybutton}{resultslist}</>;
    } else {
        return <>{checks}</>;
    }
}
function AppGridSquare({cidr, type, squareunit, cols, ip0, label}) {

    const pos = (cidr.ip - ip0.ip) / 2 ** (32 - squareunit);
    const units = 2 ** (squareunit - cidr.prefix);
    const w = (units - 1) % cols + 1;
    const h = Math.floor((units - 1) / cols);
    const rowStart = Math.floor(pos / cols) + 1;
    const rowEnd = "span " + (h + 1);
    const colStart = pos % cols + 1;
    const colEnd = "span " + (w);
    //console.log(cidr.toString()+ " pos "+ pos + " rowStart:"+rowStart+" rowEnd:"+rowEnd+" colStart: "+colStart+" colEnd: "+colEnd+ " "+type);
    const renderTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
	    {label}
            <div>{type} {cidr.toString()}</div>
            <div>ip count: {cidr.ipCount().toString()}</div>
        </Tooltip>
    );

    return (
        <OverlayTrigger
            placement="auto"
            delay={{ show: 150, hide: 100 }}
            overlay={renderTooltip}>
            <div
                id={cidr.toString()}
                className={type}
                style={{
                    gridRowStart: rowStart,
                    gridRowEnd: rowEnd,
                    gridColumnStart: colStart,
                    gridColumnEnd: colEnd,
                }} />
        </OverlayTrigger>
    );
}

function AppGrid({cidrs}) {
    const logCols = 5; 
    const cols = 2 ** logCols; //needs to be a power of 2

    if (cidrs.length === 0) {
        return null;
    }

    const maxprefix = cidrs.reduce((accumulador, cidr) => Math.max(accumulador, cidr.cidr.prefix), 0);
    const minip = cidrs.reduce((accumulador, cidr) => Math.min(accumulador, cidr.cidr.ip), cidrs[0].cidr.ip);
    const ip0 = new CIDR(minip, 32).supernet(Math.max(0, maxprefix - logCols));
    const squares = cidrs.map((cidr) => 
        <AppGridSquare 
            key={cidr}
            cidr={cidr.cidr}
	    type={cidr.type}
            squareunit={maxprefix} 
            cols={cols} 
            ip0={ip0}
	    {...(cidr.label !== undefined && { label: cidr.label })}
	/> 
    );
        
    return <div className='grid'>{squares}</div>;
}

const DEFAULT_NETWORK="10.0.0.0/21";
const DEFAULT_SUBNETS='28*3, 26, 24 "trusted" , 23 "untrusted", 10.0.5.0/25';

function CIDRForm() {
    
    const [searchParams, setSearchParams] = useSearchParams();
    let initial_network, initial_subnets;
    if ( !searchParams.has("network") && !searchParams.has("subnets")) {
        initial_network = DEFAULT_NETWORK;
        initial_subnets = DEFAULT_SUBNETS;
    } else {
        initial_network = searchParams.get("network") ?? "";
        initial_subnets = searchParams.get("subnets") ?? ""
    }
    const [network, setNetwork] = useState(initial_network);
    const [subnets, setSubnets] = useState(initial_subnets);

    function commitNetwork(value) {
	const next = new URLSearchParams(searchParams);
	next.set("network", value);
	setSearchParams(next, { replace: true});
    }

    function commitSubnets(value) {
	const next = new URLSearchParams(searchParams);
	next.set("subnets", value);
	setSearchParams(next, { replace: true});
    }

    function updateField(name, value) {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);

            if (value) next.set(name, value);
            else next.delete(name);

            return next;
        }, { replace: true });
    }

    const [cidrs, cidrerror, prefixeserror, resulterror] = doTheMath(network,subnets);
    

    return ( 
        <div className="container">
            <h1> 
                <div className="align-top d-inline-block">
                    <i className="bi bi-calculator"></i> 
                </div> <div className="align-bottom pt-2 d-inline-block">Another CIDR calculator </div>
            </h1>
	    <Accordion>
		<Accordion.Item eventKey="0">
		    <Accordion.Header>Click here for instructions</Accordion.Header>
		    <Accordion.Body>
			<p> Enter a network in CIDR format and a list of subnet sizes or CIDRs, the calculator will generate the list of subnets. </p>
			<p> Subnets can be specified by: </p>
			<ul> 
			    <li> Size (prefix): using a number, with or without forward slash '/', e.g: /24 </li>
			    <li> Multiplier: adding a multiplier to specify multple subnets of the same size, e.gg: /28*3 for three /28 subnes </li>
			    <li> Fixed subnet: using standard CIDR format, e.g: 172.23.10.0/24 </li>
			</ul>
			<p> A label can be added to each subnet using single or double quotes </p>
			<p> The order of the subnets is respected, no reordering is done. </p>	    
			<p> Runs on client, no server-side execution, no data transfer, and no cookies. </p>
			<p> The source code of this tool can be found <a href='https://github.com/ajcross/nextCIDR'>here</a>. Enhancements and bugs can be reported as GitHub issues. This tool is open-source under the <a href='https://www.gnu.org/licenses/gpl-3.0.html'>GPL-3.0 license</a>. </p>
		    </Accordion.Body>
		</Accordion.Item>
	    </Accordion>
            <div>
                <Form>
		    <Form.Label className="mb-0">Network:</Form.Label>
                    <Form.Control
                        id="cidr" 
                        type="text" 
                        name="cidr"
                        value={network}
                        onChange={e => setNetwork(e.target.value)}
			onBlur={() => commitNetwork(network)}
                        autoComplete="off" />
                    <CIDRErrorMessage 
                        message={cidrerror}
                        setNetwork={e => setNetwork(e)} />
                </Form>

                <div className="mb-3 mt-2">
                    <Form.Group>
                        <Form.Label className="mb-0">Subnets:</Form.Label>
                        <Form.Control
                            id="prefixes" 
                            type="text" 
                            value={subnets}
                            name="prefixes" 
                            onChange={e => setSubnets(e.target.value)}
			    onBlur={() => commitSubnets(subnets)}
                            autoComplete="off" />
                    </Form.Group>
                    <ErrorMessage 
                        message={prefixeserror} />
                </div>

                <ErrorMessage 
                    message={resulterror} />
                <AppGrid
                    cidrs={cidrs} />

                <SubnetList
                    subnets={cidrs}
		    />
           </div>
       </div>);
}

// ========================================

const App = () => (
    <BrowserRouter>
        <CIDRForm />
    </BrowserRouter>
);

export default App;
