var rootNode = null
var viewbox = null
var svg = null
var isMouseDown = false
var initialDistance = null
var initialViewbox = null
var initialPos = null

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

function getDistance(event) {
    // Calculate distance between two touch points
    const [touch1, touch2] = event.touches;
    const dx = touch1.pageX - touch2.pageX;
    const dy = touch1.pageY - touch2.pageY;
    return Math.sqrt(dx * dx + dy * dy);
}

function handleTouchEnd(ev) {
    initialDistance = null
    initialViewbox = null
    initialPos = null
}

function handleTouchMove(ev) {
    if (ev.touches.length === 1) {
        ev.preventDefault()
        const touch = ev.touches[0]
        if (initialPos === null) {
            initialPos = { x: touch.clientX, y: touch.clientY }
            initialViewbox = viewbox
        }
        else {
            panSvg({
                x: initialPos.x - touch.clientX,
                y: initialPos.y - touch.clientY
            }, initialViewbox)
        }
    }
    if (ev.touches.length === 2) {
        ev.preventDefault();

        const distance = getDistance(ev)
        if (initialDistance === null) {
            initialDistance = distance;
            initialViewbox = viewbox
        } else {
            const zoomFactor = (initialDistance / distance);
            console.log(zoomFactor)
            const [touch1, touch2] = ev.touches;
            const center = {
                x: (touch1.clientX + touch2.clientX) / 2,
                y: (touch1.clientY + touch2.clientY) / 2
            }

            zoomSvg(zoomFactor, center, initialViewbox)
        }
    }
}

function panSvg(distance, initialViewbox = null) {
    const svgEl = svg.node()
    const svgPos = svgEl.getBoundingClientRect()
    const svgWidth = svgPos.right - svgPos.left
    const svgHeight = svgPos.bottom - svgPos.top
    const relx = distance.x / svgWidth
    const rely = distance.y / svgHeight

    if (initialViewbox === null) {
        initialViewbox = viewbox
    }

    const newBox = [
        initialViewbox[0] + relx * initialViewbox[2],
        initialViewbox[1] + rely * initialViewbox[3],
        initialViewbox[2],
        initialViewbox[3]
    ]

    viewbox = newBox
    svg.attr("viewBox", viewbox)
}

function zoomSvg(factor, center, oldViewbox = null) {
    const svgEl = svg.node()
    const svgPos = svgEl.getBoundingClientRect()
    const svgWidth = svgPos.right - svgPos.left
    const svgHeight = svgPos.bottom - svgPos.top
    const relx = (center.x - svgPos.left) / svgWidth
    const rely = (center.y - svgPos.top) / svgHeight

    if (oldViewbox === null) {
        oldViewbox = viewbox
    }

    if (factor > 1) {
        // zooming out
        newBox = [
            oldViewbox[0] + relx * oldViewbox[2] * (1 - factor),
            oldViewbox[1] + rely * oldViewbox[3] * (1 - factor),
            oldViewbox[2] * factor,
            oldViewbox[3] * factor
        ]
    } else {
        // zooming in
        newBox = [
            oldViewbox[0] + relx * oldViewbox[2] * (1 - factor),
            oldViewbox[1] + rely * oldViewbox[3] * (1 - factor),
            oldViewbox[2] * factor,
            oldViewbox[3] * factor
        ]
    }
    viewbox = newBox
    svg.attr("viewBox", viewbox)
}

function handleScroll(event) {

    const SCROLL_FACTOR = 1.2

    const deltaRel = event.deltaY / 138 * SCROLL_FACTOR
    const factor = deltaRel < 0 ? 1 / -deltaRel : deltaRel

    zoomSvg(factor, { x: event.clientX, y: event.clientY })

    event.preventDefault()
    event.stopPropagation()
}

function handleMouseMove(event) {
    if (isMouseDown) {
        panSvg({
            x: -event.movementX,
            y: -event.movementY
        })
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
    svg = createFDTGraph(rootNode, viewbox)
    viewbox = svg.attr("viewBox").split(",").map((el) => Number(el))
    const svgNode = svg.node()
    svgNode.addEventListener("wheel", handleScroll)
    svgNode.addEventListener("mousemove", handleMouseMove)
    svgNode.addEventListener("mousedown", handleMouseDown)
    svgNode.addEventListener("mouseup", handleMouseUp)
    svgNode.addEventListener("touchmove", handleTouchMove);
    svgNode.addEventListener("touchend", handleTouchEnd)

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