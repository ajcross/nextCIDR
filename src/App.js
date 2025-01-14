import React, {useState} from 'react';
import './App.css'
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import ListGroup from 'react-bootstrap/ListGroup';
import CIDR from './ipv4.js'

class Prefixes {
    constructor(prefixes) {
        this.prefixes = prefixes;
    }
    parse(s) {
        const regex = new RegExp("^[0-9]+(\\*[0-9]+)?$");
        var pres = s.split(/[ ,]+/);
        this.prefixes = [];
        for (var i = 0; i < pres.length; i++) {
            if (pres[i] !== "") {
                const valid = regex.test(pres[i]);
                if (!valid) {
                    throw (new Error("Invalid prefix: " + pres[i]));;
                }
                const press = pres[i].split("*");
                const p = parseInt(press[0], 10);
                var mul = 1;
                if (p > 32 || p < 0) {
                    throw (new Error("Invalid prefix value, must be between 0 and 32"));
                }
                if (press.length === 2)
                    mul = parseInt(press[1], 10);
                for (var j = 0; j < mul; j++) {
                    this.prefixes.push(p);
                }
            }
        }
    }
}

function ErrorMessage({message, setCIDR}) {
    if (message) {
        const regex = new RegExp(CIDR.ipv4 + "/" + CIDR.prefix, "g");
        let result;
        var i = 0;
        var elements = [];
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


function doTheMath(cidrtxt, prefixestxt, type) {
    var subnets = [];
    var outof = [];
    var freeoutof = [];
    var prefixeserror = null;
    var resulterror = null;
    var cidrerror = null;
    var avail = [];
    var cidrs = {};
    var cidr; 

    var prefixes = new Prefixes();
    try {
        prefixes.parse(prefixestxt);
    } catch (e) {
        prefixeserror = e.message;
    }

    try {
        cidr = CIDR.parse(cidrtxt);
    } catch (e) {
        cidrerror = e.message;
    }
    if (!cidrerror && prefixes.prefixes.length > 0) {
        var i = 0;
        var subnet = cidr;
        try {
            for (i = 0; i < prefixes.prefixes.length; i++) {
                if (i === 0 && type === "supernet") {
                    subnet = new CIDR(cidr.ip, 32).supernet(prefixes.prefixes[0]);
                } else {
                    subnet = subnet.next(prefixes.prefixes[i]);
                }
                if (type === "supernet" && !subnet.isSupernet(cidr)) {
                    outof.push(subnet);
                } else {
                    subnets.push(subnet);
                }
            }
            if (outof.length > 0) {
                // find a supernet big enought for all the subnets
                var bigenough;
                for (i = Math.min(cidr.prefix - 1, outof[outof.length - 1].prefix); i >= 0; i--) {
                    bigenough = outof[outof.length - 1].supernet(i);
                    if (cidr.isSupernet(bigenough)) {
                        break;
                    }
                }
                resulterror = "no room on supernet for all subnets. You need at least /" + bigenough.prefix + " prefix, for example " + bigenough.toString();
            }
        } catch (e) {
            resulterror = e.message;
        }
        if (subnets.length > 0) {
            if (type === "first") {
                avail = avail.concat(CIDR.diff(cidr, subnets[0]));
            }
            for (var j = 0; j < subnets.length - 1; j++) {
                avail = avail.concat(CIDR.diff(subnets[j], subnets[j + 1]));
            }
            if (type === "supernet") {
                var next;
                try {
                    next=cidr.next(32);
                } catch (e) { // next went of range 
                    next=null;
                }
                avail = avail.concat(CIDR.diff(subnets[subnets.length - 1], next));
            }
            if (outof.length > 0) {
                freeoutof = CIDR.diff(cidr, outof[0]);
                for (j = 0; j < outof.length - 1; j++) {
                    freeoutof = freeoutof.concat(CIDR.diff(outof[j], outof[j + 1]));
                }
            }
        }
        cidrs = {
            "free": avail,
            "free-out-of": freeoutof,
            "subnet": subnets,
            "out-of": outof,
            "in-use": type === "first" ? [cidr] : []
        };
    }
    return [cidrs, cidrerror, prefixeserror, resulterror];
}


function SubnetList({subnets}) {

    if (subnets && subnets.length) {
        var results;
        var clipboardtxt = "";
        var subnetslist = subnets.map((subnet) => (
            <ListGroup.Item key={subnet.toString()}> 
                {subnet.toString()} 
                <div>broadcast: {subnet.broadcast().toString()}</div>
                <div>ip count: {subnet.ipCount().toString()}</div>
            </ListGroup.Item>));
        clipboardtxt = subnets.reduce((s1, s2) => (s1 + "\n" + s2));

        var resultslist =
            <div className="mt-3">
                Subnets:
                <ListGroup> {subnetslist}</ListGroup>
            </div>;
        var copybutton =
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

    var pos = (cidr.ip - ip0.ip) / 2 ** (32 - squareunit);
    var units = 2 ** (squareunit - cidr.prefix);
    var w = (units - 1) % cols + 1;
    var h = Math.floor((units - 1) / cols);
    var rowStart = Math.floor(pos / cols) + 1;
    var rowEnd = "span " + (h + 1);
    var colStart = pos % cols + 1;
    var colEnd = "span " + (w);
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
    var logCols = 5; //needs to be a power of 2

    var cols = 2 ** logCols;
    var cidrs = [];
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

    var maxprefix = cidrs.reduce((accumulador, cidr) => Math.max(accumulador, cidr.prefix), 0);
    var minip = cidrs.reduce((accumulador, cidr) => Math.min(accumulador, cidr.ip), cidrs[0].ip);
    var ip0 = new CIDR(minip, 32).supernet(Math.max(0, maxprefix - logCols));
    var squares = cidrs.map((cidr) => 
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
