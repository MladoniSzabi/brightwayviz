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

function generateColor() {
    const hue = Math.floor(Math.random() * 360)
    const sat = Math.floor(Math.random() * 50 + 50)
    const val = Math.floor(Math.random() * 40 + 40)

    return `hsl(${hue}, ${sat}%, ${val}%)`
}

function createFDTGraph(rootNode, viewbox) {

    function wrap(text, width) {
        text.each(function () {
            var text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.2, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy") || 0),
                tspan = text.text(null).append("tspan").attr("x", d => -(50 + d.data.childCount / 2) / 2).attr("y", y).attr("dy", dy + "em")
            while (word = words.pop()) {
                line.push(word)
                tspan.text(line.join(" "))
                if (line.join(" ").length > width) {
                    line.pop()
                    tspan.text(line.join(" "))
                    line = [word]
                    tspan = text.append("tspan").attr("x", d => -(50 + d.data.childCount / 2) / 2).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word)
                }
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

    const gNode = svg.append("g")
    const gLink = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)

    function update(event, source) {

        const nodes = root.descendants()
        const links = root.links();

        simulation.nodes(nodes)
        simulation.force('link').links(links)

        // Append links.
        let link = gLink
            .selectAll("line")
            .data(links, d => d.target.id)

        const linkEnter = link.enter().append("line")
        link = linkEnter.merge(link)

        link.exit().remove()

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
                    console.log(d, ins)
                    d.children = ins.children;
                    d._children = ins.children
                    d.data = newNode
                    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
                    update(event, d);
                })
            }
        })

        nodeEnter.append("circle")
            .attr("fill", d => d.color)
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .attr("r", d => 40 + d.data.childCount / 2)

        nodeEnter.append("text")
            .text(d => d.data.name)
            .attr("x", d => -(50 + d.data.childCount / 2) / 2)
            .attr("y", d => -(50 + d.data.childCount / 2) / 2)
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