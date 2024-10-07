var rootNode = null
var viewbox = null
var svg = null
var isMouseDown = false

async function expandNode(ev, data) {
    console.log(1)
    const response = await fetch(`/api/node?id=${data.id}`)
    const json = await response.json()
    // data['children'] = json['children']
    // const graphContainer = document.getElementById("graph-container")
    // graphContainer.innerHTML = ""
    // const svg = createGraph()
    // graphContainer.appendChild(svg)

    return json
}

function handleScroll(event) {

    const SCROLL_FACTOR = 1.2

    const svgEl = svg.node()
    const svgPos = svgEl.getBoundingClientRect()
    const deltaRel = event.deltaY / 138 * SCROLL_FACTOR
    const factor = deltaRel < 0 ? 1 / -deltaRel : deltaRel
    const svgWidth = svgPos.right - svgPos.left
    const svgHeight = svgPos.bottom - svgPos.top
    const relx = (event.clientX - svgPos.left) / svgWidth
    const rely = (event.clientY - svgPos.top) / svgHeight
    let newbox;

    if (factor > 1) {
        // zooming out
        newBox = [
            viewbox[0] + relx * viewbox[2] * (1 - factor),
            viewbox[1] + rely * viewbox[3] * (1 - factor),
            viewbox[2] * factor,
            viewbox[3] * factor
        ]
    } else {
        // zooming in
        newBox = [
            viewbox[0] + relx * viewbox[2] * (1 - factor),
            viewbox[1] + rely * viewbox[3] * (1 - factor),
            viewbox[2] * factor,
            viewbox[3] * factor
        ]
    }
    viewbox = newBox
    svg.attr("viewBox", viewbox)
}

function handleMouseMove(event) {
    if (isMouseDown) {
        const svgEl = svg.node()
        const svgPos = svgEl.getBoundingClientRect()
        const svgWidth = svgPos.right - svgPos.left
        const svgHeight = svgPos.bottom - svgPos.top
        const relx = -event.movementX / svgWidth
        const rely = -event.movementY / svgHeight

        const newBox = [
            viewbox[0] + relx * viewbox[2],
            viewbox[1] + rely * viewbox[3],
            viewbox[2],
            viewbox[3]
        ]

        viewbox = newBox
        svg.attr("viewBox", viewbox)
    }

}

function handleMouseDown(event) {
    isMouseDown = true;
}

function handleMouseUp(event) {
    isMouseDown = false
}


function createRadialGraph() {
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

    const svgNode = svg.node()
    svgNode.addEventListener("wheel", handleScroll)
    svgNode.addEventListener("mousemove", handleMouseMove)
    svgNode.addEventListener("mousedown", handleMouseDown)
    svgNode.addEventListener("mouseup", handleMouseUp)
    return svgNode;
}

function createTreeGraph() {
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
    const height = 0.9 * vh;
    const width = 0.8 * vw;


    // Compute the tree height; this approach will allow the height of the
    // SVG to scale according to the breadth (width) of the tree layout.
    const root = d3.hierarchy(rootNode);
    const dx = 30;
    const dy = 300;

    // Create a tree layout.
    const tree = d3.tree().nodeSize([dx, dy]);
    const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

    // Sort the tree and apply the layout.
    root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
    tree(root);

    // Compute the extent of the tree. Note that x and y are swapped here
    // because in the tree layout, x is the breadth, but when displayed, the
    // tree extends right rather than down.
    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    if (viewbox == null) {
        viewbox = [-dy / 3, x0 - dx, width, height]
    }

    svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", viewbox)

    const gLink = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);

    const gNode = svg.append("g")
        .attr("cursor", "pointer")
        .attr("pointer-events", "all");

    function update(event, source) {
        const duration = event?.altKey ? 2500 : 250; // hold the alt key to slow down the transition
        const nodes = root.descendants().reverse();
        const links = root.links();

        // Compute the new tree layout.
        tree(root);

        let left = root;
        let right = root;
        root.eachBefore(node => {
            if (node.x < left.x) left = node;
            if (node.x > right.x) right = node;
        });

        const height = right.x - left.x;

        const transition = svg.transition()
            .duration(duration)

        // Update the nodes…
        const node = gNode.selectAll("g")
            .data(nodes, d => d.id);

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append("g")
            .attr("transform", d => `translate(${source.y0},${source.x0})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0)
            .on("dblclick", (event, d) => {
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
                        }
                        console.log(d, ins)
                        d.children = ins.children;
                        d._children = ins.children
                        d.data = newNode
                        root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
                        update(event, d);
                    })
                }
            });

        nodeEnter.append("circle")
            .attr("fill", d => d._children ? "#555" : "#999")
            .attr("r", d => d.data.childCount / 10)
            .attr("cursor", "pointer")

        nodeEnter.append("text")
            .attr("dy", "0.31em")
            .attr("x", d => (d._children ? -6 : 6) + d.data.childCount / 10)
            .attr("text-anchor", d => d._children ? "end" : "start")
            .text(d => d.data.name)
            .attr("stroke", "white")
            .attr("paint-order", "stroke")
            .attr("cursor", "pointer")
            .call(wrap, 40);

        // Transition nodes to their new position.
        const nodeUpdate = node.merge(nodeEnter).transition(transition)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        const nodeExit = node.exit().transition(transition).remove()
            .attr("transform", d => `translate(${source.y},${source.x})`)
            .attr("fill-opacity", 0)
            .attr("stroke-opacity", 0);

        // Update the links…
        const link = gLink.selectAll("path")
            .data(links, d => d.target.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().append("path")
            .attr("d", d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal({ source: o, target: o });
            });

        // Transition links to their new position.
        link.merge(linkEnter).transition(transition)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition(transition).remove()
            .attr("d", d => {
                const o = { x: source.x, y: source.y };
                return diagonal({ source: o, target: o });
            });

        // Stash the old positions for transition.
        root.eachBefore(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    root.x0 = dy / 2;
    root.y0 = 0;
    root.descendants().forEach((d, i) => {
        d.id = i;
        d._children = d.children;
    });

    update(null, root);

    const svgNode = svg.node()
    svgNode.addEventListener("wheel", handleScroll)
    svgNode.addEventListener("mousemove", handleMouseMove)
    svgNode.addEventListener("mousedown", handleMouseDown)
    svgNode.addEventListener("mouseup", handleMouseUp)
    return svgNode;
}

function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", d => (d._children ? -6 : 6) + d.data.childCount / 10).attr("y", y).attr("dy", dy + "em")
        while (word = words.pop()) {
            line.push(word)
            tspan.text(line.join(" "))
            if (line.join(" ").length > width) {
                line.pop()
                tspan.text(line.join(" "))
                line = [word]
                tspan = text.append("tspan").attr("x", d => (d._children ? -6 : 6) + d.data.childCount / 10).attr("y", y).attr("dy", `${++lineNumber * lineHeight + dy}em`).text(word)
            }
        }
    })
}

function createGraph() {
    return createTreeGraph()
}

async function drawActivity(e) {

    viewbox = null

    const activityContainer = document.getElementById("activities")
    activityContainer.style.maxHeight = null

    const graphContainer = document.getElementById("graph-container")
    graphContainer.innerHTML = ""
    const activity = e.detail

    const response = await fetch(`/api/node?id=${activity.id}`)
    const node = await response.json()
    rootNode = node
    const svg = createGraph()
    graphContainer.appendChild(svg)
}

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("page-content")
    container.addEventListener("draw-activity", drawActivity)

    const activityContainer = document.getElementById("activities")
    activityContainer.style.maxHeight = activityContainer.scrollHeight + "px"

    const heading = document.getElementById("activities-heading")
    heading.addEventListener('click', () => {
        if (activityContainer.style.maxHeight) {
            activityContainer.style.maxHeight = null;
        } else {
            activityContainer.style.maxHeight = activityContainer.scrollHeight + "px"
        }
    })
})