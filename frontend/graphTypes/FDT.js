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

const seedgen = () => (0) >>> 0;
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

function showSidePanel(data) {
    console.log(data)

    sidePanel = document.getElementById("side-panel")
    sidePanel.classList.add("open")

    fetch("/api/activity/" + String(data.id))
        .then((response) => response.json())
        .then((data) => {
            document.getElementById("side-panel-title").textContent = capitalise(data.name)
            document.getElementById("side-panel-activity-uuid").textContent = data['activity_uuid'].toUpperCase()
            document.getElementById("side-panel-product-uuid").textContent = data['product_uuid'].toUpperCase()
            document.getElementById("side-panel-product").textContent = data.product
            document.getElementById("side-panel-section").textContent = data.section
            document.getElementById("side-panel-sectors").textContent = data.sectors.join("; ")
            document.getElementById("side-panel-geography").textContent = data.location
            document.getElementById("side-panel-unit").textContent = data.unit
            document.getElementById("side-panel-activity-type").textContent = data['activity_type']
            document.getElementById("side-panel-time-period").textContent = String(data['time-period'].start) + " - " + String(data['time-period'].finish)
            document.getElementById("side-panel-type").textContent = data['type']
            document.getElementById("side-panel-classification-isic").textContent = "None"
            document.getElementById("side-panel-classification-cpc").textContent = "None"
            document.getElementById("side-panel-classification-other").textContent = "None"

            for (const classificationArray of data.classifications) {
                if (classificationArray[0].includes("ISIC")) {
                    document.getElementById("side-panel-classification-isic").textContent = classificationArray[1]
                } else if (classificationArray[0].includes("CPC")) {
                    document.getElementById("side-panel-classification-cpc").textContent = classificationArray[1]
                } else {
                    document.getElementById("side-panel-classification-other").textContent = classificationArray[1]
                }
            }

        })
}

function generateColor() {
    const hue = Math.floor(getRand() * 360)
    const sat = Math.floor(getRand() * 50 + 50)
    const val = Math.floor(getRand() * 40 + 40)

    return `hsl(${hue}, ${sat}%, ${val}%)`
}

function createFDTGraph(rootNode, viewbox) {

    getRand = sfc32(seedgen(), seedgen(), seedgen(), seedgen());

    function wrap(text, width) {
        text.each(function () {
            let text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineHeight = 1.2, // ems
                dy = parseFloat(text.attr("dy") || 0),
                lines = [];
            text.text(null).attr("x", 0).attr("y", 0)
            while (word = words.pop()) {
                line.push(word)
                if (line.join(" ").length > width) {
                    line.pop()
                    lines.push(line.join(" "))
                    line = [word]
                }
            }

            if (line.length > 0) {
                lines.push(line.join(" "))
            }

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
        if (d.data.isAtBoundary) {
            d.color = generateColor()
        } else {
            d.color = color
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
                update(event, d);
            } else {
                expandNode(event, d.data).then((newNode) => {
                    let ins = d3.hierarchy(newNode);
                    let ccount = root.descendants().length;
                    ins.depth = d.depth + 1;
                    ins.id = ccount + 1;
                    ins.parent = d
                    for (let i = 0; i < ins.children.length; i++) {
                        ins.children[i]['depth'] = 1 + d.depth
                        ins.children[i]['height'] = 1 + d.height
                        ins.children[i]['id'] = i + ccount + 2
                        ins.children[i]['children'] = null;
                        ins.children[i]['parent'] = d
                        ins.children[i]['x'] = d.x + Math.random() * 50
                        ins.children[i]['y'] = d.y + Math.random() * 50
                        if (ins.children[i].data.isAtBoundary) {
                            ins.children[i]['color'] = generateColor()
                        } else {
                            ins.children[i]['color'] = d.color
                        }
                    }
                    d.children = ins.children;
                    d._children = ins.children
                    d.data = newNode
                    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
                    update(event, d);
                })
            }
        })

        nodeEnter.on('click', (event, d) => {
            showSidePanel(d.data)
        })

        nodeEnter.append("circle")
            .attr("fill", d => d.color)
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .attr("r", d => 40 + d.data.childCount / 2)

        nodeEnter.append("text")
            .text(d => d.data.name)
            .attr("alignment-baseline", "central")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle")
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