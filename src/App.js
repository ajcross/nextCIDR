import React, {useState} from 'react';
import './App.css'
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import ListGroup from 'react-bootstrap/ListGroup';
import CIDR from './ipv4.js'
import { doTheMath } from './cidrCalc.js'

function ErrorMessage({message, setCIDR}) {
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
                    onClick={(e) => setCIDR(e.target.innerHTML)}> 
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
    if (subnets && subnets.length) {
        let results;
        let clipboardtxt = "";
        let subnetslist = subnets.map((subnet) => (
            <ListGroup.Item key={subnet.cidr.toString()}>
		{subnet.label}
                <div>{subnet.cidr.toString()} </div>
                <div>broadcast: {subnet.cidr.broadcast().toString()}</div>
                <div>ip count: {subnet.cidr.ipCount().toString()}</div>
            </ListGroup.Item>));
        clipboardtxt = subnets.reduce((s1, s2) => (`${s1}\n${s2.label ? `${s2.label}: `: ""}${s2.cidr.toString()}`),
				      clipboardtxt);

        let resultslist =
            <div className="mt-3">
                Subnets:
                <ListGroup> {subnetslist}</ListGroup>
            </div>;
        let copybutton =
            <Button  
                className="mt-1"
                variant="outline-primary"
                onClick={() => navigator.clipboard.writeText(clipboardtxt)}>
                <i className="bi bi-clipboard align-top"/> Copy
            </Button>;
        results = <>{resultslist}{copybutton}</>;
        return results;
    } else {
        return null;
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
                className={type+' square'}
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

function CIDRForm() {
    const [cidr, setCIDR] = useState("10.0.0.0/21");
    const [prefixes, setPrefixes] = useState('28*3, 26, 24 "trusted subnet" , 23 "untrusted subnet"');

    const [cidrs, cidrerror, prefixeserror, resulterror] = doTheMath(cidr,prefixes);

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
            <p> The source code of this tool can be found <a href='https://github.com/ajcross/nextCIDR'>here</a>. Enhancements and bugs can be reported as GitHub issues. This tool is open-source under the <a href='https://www.gnu.org/licenses/gpl-3.0.html'>GPL-3.0 license</a>. </p>
            <div>
                <Form>
                    <Form.Control
                        id="cidr" 
                        type="text" 
                        name="cidr"
                        value={cidr}
                        onChange={e => setCIDR(e.target.value)} 
                        autoComplete="off" />
                    <ErrorMessage 
                        message={cidrerror}
                        setCIDR={setCIDR} />
                </Form>

                <div className="mb-3 mt-2">
                    <Form.Group>
                        <Form.Label className="mb-0">Prefixes:</Form.Label>
                        <Form.Control
                            id="prefixes" 
                            type="text" 
                            value={prefixes}
                            name="prefixes" 
                            onChange={e => setPrefixes(e.target.value)}
                            autoComplete="off" />
                    </Form.Group>
                    <ErrorMessage 
                        message={prefixeserror}
                        setCIDR={setCIDR} />
                </div>

                <ErrorMessage 
                    message={resulterror}
                    setCIDR={setCIDR} />
                <AppGrid
                    cidrs={cidrs} />
                <SubnetList
                    subnets={cidrs.filter((subnet) => subnet.type === "subnet")}/>
           </div>
       </div>);
}

// ========================================

const App = () => (
    <CIDRForm />
);

export default App;
