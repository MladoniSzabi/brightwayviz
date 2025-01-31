function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

function invertColor(hex, bw) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        // https://stackoverflow.com/a/3943023/112731
        return (r * 0.299 + g * 0.587 + b * 0.114) > 186
            ? '#000000'
            : '#FFFFFF';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b);
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function sfc32(a, b, c, d) {
    return function () {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (a + b | 0) + d | 0;
        d = d + 1 | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

const seedgen = () => (3) >>> 0;
var getRand = sfc32(seedgen(), seedgen(), seedgen(), seedgen());

drag = simulation => {

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
}

function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function populateAggregationSidePanel(data) {

    document.getElementById("side-panel-data").style.display = "none"
    document.getElementById("side-panel-aggregation").style.display = ""

    document.getElementById("side-panel-title").textContent = capitalise(data.name)

    if ("count" in data) {
        document.getElementById("side-panel-first-tier").style.display = "inline"
        document.getElementById("side-panel-first-tier").previousElementSibling.style.display = "inline"
        document.getElementById("side-panel-first-tier").textContent = String(data["count"])
    } else {
        document.getElementById("side-panel-first-tier").style.display = "none"
        document.getElementById("side-panel-first-tier").previousElementSibling.style.display = "none"
    }

    if ("activities" in data) {
        document.getElementById("side-panel-activities").style.display = "inline"
        //document.getElementById("side-panel-activities").style.lineBreak = "anywhere"
        document.getElementById("side-panel-activities").previousElementSibling.style.display = "inline"
        document.getElementById("side-panel-activities").textContent = String(JSON.stringify(data["activities"])).replaceAll(",", ", ")
    } else {
        document.getElementById("side-panel-activities").style.display = "none"
        document.getElementById("side-panel-activities").previousElementSibling.style.display = "none"
    }
}

function populateSidePanel(data) {

    document.getElementById("side-panel-aggregation").style.display = "none"
    document.getElementById("side-panel-data").style.display = ""

    document.getElementById("side-panel-title").textContent = capitalise(data.name)
    document.getElementById("side-panel-activity-uuid").textContent = data['activity_uuid'].toUpperCase()
    document.getElementById("side-panel-product-uuid").textContent = data['product_uuid'].toUpperCase()
    document.getElementById("side-panel-product").textContent = data.product
    document.getElementById("side-panel-section").textContent = data.section
    document.getElementById("side-panel-sectors").textContent = data.sectors.join("; ")
    document.getElementById("side-panel-geography").textContent = data.location
    document.getElementById("side-panel-unit").textContent = data.unit
    document.getElementById("side-panel-time-period").textContent = String(data['time-period'].start) + " - " + String(data['time-period'].finish)
    document.getElementById("side-panel-type").textContent = data['type']
    document.getElementById("side-panel-classification-isic").textContent = "None"
    document.getElementById("side-panel-classification-cpc").textContent = "None"
    document.getElementById("side-panel-classification-other").textContent = "None"

    let otherClass = []

    for (const classKey in data.classifications) {
        if (classKey.toLowerCase().includes("isic")) {
            document.getElementById("side-panel-classification-isic").textContent = data.classifications[classKey]
        } else if (classKey.toLowerCase().includes("cpc")) {
            document.getElementById("side-panel-classification-cpc").textContent = data.classifications[classKey]
        } else {
            otherClass.push(data.classifications[classKey])
        }
    }

    document.getElementById("side-panel-classification-other").textContent = otherClass.join(", ")
}

function showSidePanel(data) {
    sidePanel = document.getElementById("side-panel")
    sidePanel.classList.add("open")

    if (data["id"] == 0) {
        populateAggregationSidePanel(data)
        return;
    }

    fetch("/api/activity/" + String(data.id) + "?database=" + DATABASE)
        .then((response) => response.json())
        .then((fetchedData) => {
            console.log(fetchedData)
            if ("count" in data) {
                fetchedData["count"] = data["count"]
            }
            populateSidePanel(fetchedData)
        })
}

function calculateNewNodePosition(parent, index, max) {
    if (parent.parent) {
        let directionVector = {
            'x': parent.x - parent.parent.x,
            'y': parent.y - parent.parent.y
        }

        angle = Math.atan(Math.abs(directionVector.y) / Math.abs(directionVector.x))

        if (directionVector.x < 0 && directionVector.y > 0) {
            angle = Math.PI - angle
        } else if (directionVector.x < 0 && directionVector.y < 0) {
            angle = - (Math.PI - angle)
        } else if (directionVector.x > 0 && directionVector.y < 0) {
            angle = -angle
        }

        if (index != 0) {
            angle += (Math.PI * Math.min(max * 20, 200) / 180) * ((index / (max - 1)) - 0.5)
        }

        radious = 600
        return {
            'x': parent.x + radious * Math.cos(angle),
            'y': parent.y + radious * Math.sin(angle)
        }
    }

    return { 'x': 0, 'y': 0 }
}

function generateColor() {
    const hue = Math.floor(getRand() * 360)
    const sat = Math.floor(getRand() * 50 + 50)
    const val = Math.floor(getRand() * 40 + 40)

    return hslToHex(hue, sat, val)
}

function getColorFromTag(tag) {
    if (tag == "renewable_wind")
        return "#8fd14d"
    else if (tag == "renewable_hydro")
        return "#66a22a"
    else if (tag == "renewable_solar")
        return "#b3e085"
    else if (tag == "renewable_geothermal")
        return "#8fe33b3"
    else if (tag == "renewable_methanol")
        return "#66b319"
    else if (tag == "renewable_biogas")
        return "#b3ec79"
    else if (tag == "renewable_biometahne")
        return "#8fc15c"
    else if (tag == "renewable_ethanol")
        return "#669438"
    else if (tag == "renewable_biodiesel")
        return "#b3d590"
    else if (tag == "production_process")
        return "#85b8ff"
    else if (tag == "gaseous_fuel")
        return "#cce1ff"
    else if (tag == "liquid_fuel")
        return "#d0e2fb"
    else if (tag == "solid_fuel")
        return "#8eb9f6"
    else if (tag == "electricity")
        return "#12CDD4"
    else if (tag == "heat_and_steam")
        return "#0c888d"
    else if (tag == "cooling")
        return "#22bec3"
    else if (tag == "purchased_goods_and_services")
        return "#414BB2"
    else if (tag == "transport_and_distribution")
        return "#383e7a"
    else if (tag == "fuel_and_energy_related_activities")
        return "#505695"
    else if (tag == "business_travel")
        return "#5057a5"
    else if (tag == "capital_goods")
        return "#878cc5"
    else if (tag == "waste")
        return "#7981d2"
    else if (tag == "intermediate")
        return "#ce5a5a"

    return null
}

function getColorForLayer(layer) {
    colors = [
        // "#cc503e",
        // "#994e95",
        // "#666",
        // "#1d6996",
        // "#858B4F",
        // "#edad08",
        // "#72af48",
        // "#94346e",
        // "#660A8A",
        // "#38a6a5",
        // "#e17c06",
        // "#AF614B",
        // "#5f4690",
        // "#0d8554",
        // "#6f4070"

        "#cc503e",
        "#bf5144",
        "#b3534a",
        "#a65550",
        "#9a5757",
        "#8d585d",
        "#815a63",
        "#745c6a",
        "#685e70",
        "#5b6076",
        "#4f617c",
        "#426383",
        "#366589",
        "#29678f",
        "#1d6996",
    ]

    return colors[layer % colors.length]
}

function setIds(tree, start, depth, height) {
    if (tree == null)
        return start;

    tree['id'] = ++start
    tree['depth'] = depth++
    tree['height'] == height++
    if (!('children' in tree)) {
        return start;
    }
    for (let i = 0; i < tree.children.length; i++) {
        tree.children[i]['parent'] = tree
        let pos = calculateNewNodePosition(tree, i, tree.children.length)
        tree.children[i]['x'] = pos.x
        tree.children[i]['y'] = pos.y
        console.log(tree.children[i].data)
        if (tree.children[i].data["colour"]) {
            tree.children[i]["color"] = tree.children[i].data["colour"]
        } else if (tree.children[i].data["tag"] && getColorFromTag(tree.children[i].data["tag"])) {
            tree.children[i]["color"] = getColorFromTag(tree.children[i].data["tag"])
        }
        else if (tree.children[i].data.isAtBoundary) {
            tree.children[i]['color'] = generateColor()
        } else {
            //tree.children[i]['color'] = tree.color
            tree.children[i]['color'] = getColorForLayer(tree.depth);
        }
        start = setIds(tree.children[i], start, depth, height)
    }
    return start
}

function addSubTree(newNode, root, d) {
    let ins = d3.hierarchy(newNode);
    let ccount = root.descendants().length;
    ins.color = d.color
    ins.parent = d.parent
    ins.x = d.x
    ins.y = d.y
    setIds(ins, ccount, d.depth, d.height)
    for (let i = 0; i < ins.children.length; i++) {
        ins.children[i].parent = d
    }
    d.children = ins.children;
    d._children = ins.children
    d.data = newNode
}

function createFDTGraph(rootNode, viewbox) {

    getRand = sfc32(seedgen(), seedgen(), seedgen(), seedgen());

    function wrap(text, width) {
        text.each(function () {
            let text = d3.select(this),
                fullText = text.text(),
                words = fullText.split(/\s+/).reverse(),
                word,
                line = [],
                lineHeight = 1.2, // ems
                dy = parseFloat(text.attr("dy") || 0),
                lines = [];
            text.text(null).attr("x", 0).attr("y", 0).attr("font-size", "16px")

            // if (fullText.includes(":")) {
            //     text.append("tspan").attr("x", 0).attr("y", 0).text(fullText.slice(0, fullText.indexOf(":")))
            //     return;
            // }

            let textLength = fullText.length
            let fontSize = 16
            if (textLength >= 110) {
                fontSize = 10
            } else if (textLength >= 80) {
                fontSize = 12
            } else if (textLength >= 50) {
                fontSize = 14
            }
            text.attr("font-size", String(fontSize) + "px")

            while (word = words.pop()) {
                line.push(word)
                if (line.join(" ").length > width * 16 / fontSize) {
                    line.pop()
                    lines.push(line.join(" "))
                    line = [word]
                }
            }

            if (line.length > 0) {
                lines.push(line.join(" "))
            }

            console.log(lines, lines.length)
            if (lines.length >= 11) {
                lines = lines.slice(0, 10)
                lines.push("...")
            }
            console.log(lines, lines.length)

            let start = -(lines.length - 1) / 2
            for (let i = 0; i < lines.length; i += 1) {
                text.append("tspan").attr("x", 0).attr("y", 0).attr("dy", `${(start + i) * lineHeight + dy}em`).text(lines[i])
            }
        })
    }

    // Specify the chart’s dimensions.
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const height = 0.9 * vh;
    const width = 0.8 * vw;

    // Compute the graph and start the force simulation.
    const root = d3.hierarchy(rootNode);

    let color = generateColor()

    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.data.colour) {
            d.color = d.data.colour
        }
        else if (d.data.tag && getColorFromTag(d.data.tag)) {
            if (d.depth == 0)
                d.color = "#983334"
            else
                d.color = getColorFromTag(d.data.tag)
        }
        else if (d.data.isAtBoundary) {
            d.color = generateColor()
        } else {
            //d.color = color
            d.color = getColorForLayer(d.depth);
        }
    });

    const links = root.links();
    const nodes = root.descendants();

    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(500).strength(0.1))
        .force("charge", d3.forceManyBody().strength(-800));

    if (viewbox == null) {
        viewbox = [-width / 2, -height / 2, width, height]
    }

    // Create the container SVG.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", viewbox);

    const gLink = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)

    const gNode = svg.append("g")

    function update(event, source) {

        const nodes = root.descendants()
        const links = root.links();

        simulation.nodes(nodes)
        simulation.force('link').links(links)

        // Append links.
        let link = gLink
            .selectAll("line")
            .data(links, d => d.target.id)

        link.exit().remove()

        const linkEnter = link.enter().append("line")

        link = linkEnter.merge(link)

        // Append nodes.
        let node = gNode
            .selectAll("g")
            .data(nodes, d => d.id)

        node.exit().remove()

        const nodeEnter = node.enter()
            .append("g")
            .call(drag(simulation))

        nodeEnter.on('dblclick', (event, d) => {
            if (d._children) {
                d.children = d.children ? null : d._children;
                update(event, d)
            } else if (d.data._children) {
                d.children = []
                d.data.children = d.data._children
                addSubTree(d.data, root, d)
                //d.children = d.children ? null : d.data._children
                update(event, d)
            } else {
                if (d.data.id) {
                    expandNode(event, d.data).then((newNode) => {
                        addSubTree(newNode, root, d)
                        update(event, d)
                        root.sort((a, b) => d3.ascending(a.data.name, b.data.name))
                    })
                }
            }
        })

        nodeEnter.on('click', (event, d) => {
            showSidePanel(d.data)
        })

        nodeEnter.on('contextmenu', (ev, d) => {
            if (d.data.id) {
                if (d.data.children || d.data._children) {
                    ev.stopPropagation()
                    ev.preventDefault()
                    return false
                }
                showContextMenu(ev, (layers, agrifood_only) => {
                    expandNode(event, d.data, layers, agrifood_only).then((newNode) => {
                        addSubTree(newNode, root, d)
                        update(event, d)
                        root.sort((a, b) => d3.ascending(a.data.name, b.data.name))
                    })
                })

                return false
            }
        })

        nodeEnter.append("circle")
            .attr("fill", d => d.color)
            .attr("stroke", d => d.data.childCount == 0 ? "#fff" : "#000")
            .attr("stroke-width", 3)
            .attr("r", d => 80)

        nodeEnter.append("text")
            .text(d => d.data.name)
            .attr("alignment-baseline", "central")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle")
            .attr("fill", d => invertColor(d.color, true))
            .call(wrap, 10);

        node = nodeEnter.merge(node)

        simulation.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr('transform', d => `translate(${d.x},${d.y})`);
        });
    }

    update(null, root);

    return svg;
}