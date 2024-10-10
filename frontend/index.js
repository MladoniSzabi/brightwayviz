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
    event.preventDefault()
    event.stopPropagation()
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

function drag(simulation) {

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

function createGraph() {
    svg = createFDTGraph(rootNode, svg, viewbox)
    viewbox = svg.attr("viewBox").split(",").map((el) => Number(el))
    console.log(viewbox)
    const svgNode = svg.node()
    svgNode.addEventListener("wheel", handleScroll)
    svgNode.addEventListener("mousemove", handleMouseMove)
    svgNode.addEventListener("mousedown", handleMouseDown)
    svgNode.addEventListener("mouseup", handleMouseUp)

    return svgNode
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
    const svgNode = createGraph()
    graphContainer.appendChild(svgNode)
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