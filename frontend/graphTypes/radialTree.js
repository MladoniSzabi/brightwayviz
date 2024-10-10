function createRadialGraph(rootNode, viewbox) {
    // Specify the chart’s dimensions.

    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const height = 0.9 * vh;
    const width = 0.8 * vw;

    const cx = width * 0.5; // adjust as needed to fit
    const cy = height * 0.59; // adjust as needed to fit
    const radius = Math.min(width, height) / 2 - 80;

    if (viewbox == null) {
        viewbox = [-cx, -cy, width, height]
    }

    // Creates the SVG container.
    svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", viewbox)

    // Create a radial tree layout. The layout’s first dimension (x)
    // is the angle, while the second (y) is the radius.
    const tree = d3.cluster()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    // Sort the tree and apply the layout.
    const root = tree(d3.hierarchy(rootNode)
        .sort((a, b) => d3.ascending(a.data.name, b.data.name)));

    // Append links.
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll()
        .data(root.links())
        .join("path")
        .attr("d", d3.linkRadial()
            .angle(d => d.x)
            .radius(d => d.y));

    // Append nodes.
    svg.append("g")
        .selectAll()
        .data(root.descendants())
        .join("circle")
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
        .attr("fill", d => d.children ? "#555" : "#999")
        .attr("cursor", "pointer")
        .attr("r", 2.5)
        .on("dblclick", (ev, d) => expandNode(ev, d.data));


    // Append labels.
    svg.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll()
        .data(root.descendants())
        .join("text")
        .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0) rotate(${d.x >= Math.PI ? 180 : 0})`)
        .attr("dy", "0.31em")
        .attr("x", d => d.x < Math.PI === !d.children ? 6 : -6)
        .attr("text-anchor", d => d.x < Math.PI === !d.children ? "start" : "end")
        .attr("paint-order", "stroke")
        .attr("stroke", "white")
        .attr("fill", "currentColor")
        .attr("cursor", "pointer")
        .text(d => d.data.name)
        .on("dblclick", (ev, d) => expandNode(ev, d.data));

    return svg;
}