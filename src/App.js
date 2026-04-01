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
            <ListGroup.Item key={subnet.toString()}> 
                {subnet.toString()} 
                <div>broadcast: {subnet.broadcast().toString()}</div>
                <div>ip count: {subnet.ipCount().toString()}</div>
            </ListGroup.Item>));
        clipboardtxt = subnets.reduce((s1, s2) => (s1 + "\n" + s2));

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
function AppGridSquare({cidr, squareunit, cols, ip0}) {

    const pos = (cidr.ip - ip0.ip) / 2 ** (32 - squareunit);
    const units = 2 ** (squareunit - cidr.prefix);
    const w = (units - 1) % cols + 1;
    const h = Math.floor((units - 1) / cols);
    const rowStart = Math.floor(pos / cols) + 1;
    const rowEnd = "span " + (h + 1);
    const colStart = pos % cols + 1;
    const colEnd = "span " + (w);
    //console.log(cidr.toString()+ " pos "+ pos + " rowStart:"+rowStart+" rowEnd:"+rowEnd+" colStart: "+colStart+" colEnd: "+colEnd+ " "+cidr.type);
    const renderTooltip = (props) => (
        <Tooltip id="button-tooltip" {...props}>
            {cidr.type} {cidr.toString()}
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

function AppGrid({cidrsdict}) {
    const logCols = 5; //needs to be a power of 2

    const cols = 2 ** logCols;
    let cidrs = [];
    // join the cidrs in a single array adding a type 
    for (const [key, value] of Object.entries(cidrsdict)) {
        cidrs = cidrs.concat(value.map((cidr) => {
            cidr.type = key;
            return cidr
        }));
    }

    if (cidrs.length === 0) {
        return null;
    }

    const maxprefix = cidrs.reduce((accumulador, cidr) => Math.max(accumulador, cidr.prefix), 0);
    const minip = cidrs.reduce((accumulador, cidr) => Math.min(accumulador, cidr.ip), cidrs[0].ip);
    const ip0 = new CIDR(minip, 32).supernet(Math.max(0, maxprefix - logCols));
    const squares = cidrs.map((cidr) => 
        <AppGridSquare 
            key={cidr}
            cidr={cidr} 
            squareunit={maxprefix} 
            cols={cols} 
            ip0={ip0} /> 
    );
        
    return <div className='grid'>{squares}</div>;
}

function CIDRForm() {
    const [cidr, setCIDR] = useState("10.0.0.0/21");
    const [prefixes, setPrefixes] = useState("28*3, 26, 24, 23");
    const [type, setType] = useState("supernet");

    const [cidrs, cidrerror, prefixeserror, resulterror] = doTheMath(cidr,prefixes,type);

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
                    <Form.Check
                        value="first"
                        id="first"
                        label='start after'
                        type='radio'
                        inline
                        checked={type==='first'} 
                        onChange={e => setType(e.target.value)} 
                        name="type" />

                    <Form.Check
                        value="supernet"
                        id="supernet"
                        label='supernet'
                        type='radio'
                        inline
                        checked={type==='supernet'} 
                        onChange={e => setType(e.target.value)} 
                        name="type" />

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
                    cidrsdict={cidrs} />
                <SubnetList
                    subnets={cidrs["subnet"]}/>
           </div>
       </div>);
}

// ========================================

const App = () => (
    <CIDRForm />
);

export default App;
