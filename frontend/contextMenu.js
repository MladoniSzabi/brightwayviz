var currentContextMenu = null
var secondMenu = null
var callback = null

function pointRectCollision(point, rect) {
    if (point.x < rect.x)
        return false;

    if (point.x > rect.x + rect.width)
        return false

    if (point.y < rect.y)
        return false

    if (point.y > rect.y + rect.height)
        return false

    return true
}

function hideContextMenus() {
    callback = null
    currentContextMenu.style.display = 'none'
    currentContextMenu = null
    if (secondMenu) {
        secondMenu.style.display = 'none'
        secondMenu = null
    }
}

function onMouseMove(event) {
    if (currentContextMenu === null) {
        return;
    }

    if (event.target.nodeName == "P" && event.target.parentElement.parentElement == currentContextMenu) {
        if (secondMenu != null && secondMenu != event.target.parentElement.children[1]) {
            secondMenu.style.display = 'none'
        }
        secondMenu = event.target.parentElement.children[1]
        secondMenu.style.display = 'flex'
    }

    const rect = currentContextMenu.getBoundingClientRect()

    if (!pointRectCollision(
        { x: event.clientX, y: event.clientY },
        { x: rect.x - 10, y: rect.y - 10, width: rect.width + 10, height: rect.height + 10 }
    )) {
        if (secondMenu) {
            const secondRect = secondMenu.getBoundingClientRect()
            if (!pointRectCollision(
                { x: event.clientX, y: event.clientY },
                { x: secondRect.x - 10, y: secondRect.y - 10, width: secondRect.width + 10, height: secondRect.height + 10 }
            )) {
                hideContextMenus()
            }
        } else {
            hideContextMenus()
        }
    }
}

function showContextMenu(event, cb) {
    callback = cb
    const contextMenu = document.getElementById("context-menu")
    const container = document.getElementById("svg-container")

    currentContextMenu = contextMenu

    contextMenu.style.display = 'block'
    contextMenu.style.top = event.clientY - container.getBoundingClientRect().top + "px"
    contextMenu.style.left = event.clientX - container.getBoundingClientRect().left + "px"
    contextMenu.style.display = 'flex'

    event.stopPropagation()
    event.preventDefault()

    return false
}

document.addEventListener("mousemove", onMouseMove)
document.addEventListener("DOMContentLoaded", () => {
    const agrifood = document.getElementById("context-menu-agri-food")
    const nonagrifood = document.getElementById("context-menu-all")

    agrifood.children[0].addEventListener("click", () => { if (callback === null) { return } callback(3, true); hideContextMenus() })
    agrifood.children[1].addEventListener("click", () => { if (callback === null) { return } callback(5, true); hideContextMenus() })
    agrifood.children[2].addEventListener("click", () => { if (callback === null) { return } callback(7, true); hideContextMenus() })

    nonagrifood.children[0].addEventListener("click", () => { if (callback === null) { return } callback(2, false); hideContextMenus() })
    nonagrifood.children[1].addEventListener("click", () => { if (callback === null) { return } callback(3, false); hideContextMenus() })
})