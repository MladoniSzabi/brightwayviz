function createRadialGraph(rootNode, viewbox) {

    function handleClick(event, d) {
        showSidePanel(d.data)
    }

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
            text.text(null).attr("x", 0).attr("y", 0).attr("font-size", "16px")

            let textLength = words.join(" ").length
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

            if (lines.length >= 11) {
                lines = lines.slice(0, 10)
                lines.push("...")
            }

            let start = -(lines.length - 1) / 2
            for (let i = 0; i < lines.length; i += 1) {
                text.append("tspan")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("dy", `${(start + i) * lineHeight + dy}em`)
                    .text(lines[i])
            }
        })
    }

    // Specify the chart’s dimensions.
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const height = 0.9 * vh;
    const width = 0.8 * vw;
    const radius = TIDY_TREE_RADIUS

    const tree = d3.tree()
        .size([2 * Math.PI, Math.min(width, height) * 1000 - 30])
        .separation((a, b) => ((a.parent == b.parent ? 2 : 2) / a.depth));

    // Compute the graph and start the force simulation.
    const root = tree(d3.hierarchy(rootNode))

    let color = generateColor()

    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
        if (d.data.colour)
            d.color = d.data.colour
        else if (GRAPH_COLOURING == "tags" && d.depth == 0)
            d.color = "#983334"
        else if (GRAPH_COLOURING == "tags" && d.data.tag && getColorFromTag(d.data.tag))
            d.color = getColorFromTag(d.data.tag)
        else
            d.color = getColorForLayer(d.depth);
    });

    if (viewbox == null) {
        viewbox = [-width / 2, -height / 2, width, height]
    }

    // Create the container SVG.
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", viewbox);

    const firstNodeOffset = 0

    // Append links.
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll()
        .data(root.links(), d => d.target.id)
        .join("line")
        .attr("x1", d => (d.source.depth) * radius * Math.cos(d.source.x - Math.PI))
        .attr("y1", d => ((d.source.depth) * radius + (d.source.depth == 0 ? firstNodeOffset : 0)) * Math.sin(d.source.x - Math.PI))
        .attr("x2", d => (d.target.depth) * radius * Math.cos(d.target.x - Math.PI))
        .attr("y2", d => ((d.target.depth) * radius + (d.target.depth == 0 ? firstNodeOffset : 0)) * Math.sin(d.target.x - Math.PI));
    // .join("path")
    // .attr("d", d3.linkRadial()
    //     .angle(d => d.x)
    //     .radius(d => d.depth * radius));

    // Append nodes.
    svg.append("g")
        .selectAll()
        .data(root.descendants())
        .join("circle")
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 180}) translate(${(d.depth) * radius},0) translate(0, ${d.depth == 0 ? firstNodeOffset : 0})`)
        .attr("fill", d => d.color)
        .attr("stroke", d => d.data.childCount == 0 ? "#fff" : "#000")
        .attr("stroke-width", 3)
        .attr("r", d => 80)
        .on('click', handleClick)

    // Append labels.
    svg.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll()
        .data(root.descendants())
        .join("text")
        .text(d => d.data.name)
        .attr("alignment-baseline", "central")
        .attr("dominant-baseline", "central")
        .attr("text-anchor", "middle")
        .attr("fill", d => invertColor(d.color, true))
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 180}) translate(${(d.depth) * radius} ,0) rotate(${(d.x >= Math.PI / 2 && d.x <= 3 * Math.PI / 2) ? 0 : 180}) translate(0, ${d.depth == 0 ? firstNodeOffset : 0})`)
        .call(wrap, 10)
        .on('click', handleClick)

    return svg;
}