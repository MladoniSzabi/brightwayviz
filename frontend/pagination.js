var ItemsPerPage = 5
var CurrentPage = 0
var TotalItems = 0
var SearchTerm = ""

function sanitizeString(str) {
    str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim, "");
    return str.trim();
}

async function getItemCount() {
    let response = await fetch(`/api/activity/total?search=${sanitizeString(SearchTerm)}`)
    if (response.status != 200) {
        // error
    }
    TotalItems = Number(await response.text())
    return TotalItems
}

async function getPage(pageNumber, itemsPerPage) {
    let response = await fetch(`/api/activity?page=${pageNumber}&count=${itemsPerPage}&search=${sanitizeString(SearchTerm)}`)
    if (response.status != 200) {
        // error
    }
    let activities = await response.json()
    return activities
}

function populateTable(data) {
    let container = document.getElementById("page-content")
    container.innerHTML = ""
    for (let activity of data) {
        row = document.createElement("tr")
        cells = {}
        for (let key in activity) {
            cells[key] = document.createElement("td")
            cells[key].innerHTML = sanitizeString(String(activity[key]))
        }

        row.appendChild(cells["name"])
        row.appendChild(cells["product"])
        row.appendChild(cells["unit"])
        row.appendChild(cells["location"])
        //row.appendChild(cells["sector"])
        row.appendChild(cells["type"])

        let showButton = document.createElement("a")
        showButton.innerHTML = "Show"
        const DrawActivityEvent = new CustomEvent("draw-activity", { detail: activity })
        showButton.onclick = () => {
            container.dispatchEvent(DrawActivityEvent)
        }
        let showButtonContainer = document.createElement("td")
        showButtonContainer.appendChild(showButton)
        row.appendChild(showButtonContainer)

        container.appendChild(row)
        let activityContainer = document.getElementById("activities")
        activityContainer.style.maxHeight = activityContainer.scrollHeight + 5 + "px"
    }
}

function setUpPaginationPageSelect(pages) {
    let container = document.getElementById("pagination-page-select")
    container.innerHTML = ""
    let prevArrow = document.createElement("button")
    prevArrow.innerHTML = "<"
    if (CurrentPage <= 0) {
        prevArrow.disabled = true
    } else {
        prevArrow.onclick = () => {
            if (CurrentPage == 0)
                return

            loadActivities(CurrentPage - 1)
        }
    }
    container.appendChild(prevArrow)

    let nextArrow = document.createElement("button")
    nextArrow.innerHTML = ">"
    let pageCount = Math.ceil(TotalItems / ItemsPerPage)
    if (CurrentPage >= pageCount - 1) {
        nextArrow.disabled = true
    } else {
        nextArrow.onclick = () => {
            let pageCount = Math.ceil(TotalItems / ItemsPerPage)
            if (CurrentPage == pageCount - 1)
                return

            loadActivities(CurrentPage + 1)
        }
    }

    if (CurrentPage > 3) {
        let ellipses = document.createElement("p")
        ellipses.innerHTML = "..."
        container.appendChild(ellipses)
    }

    for (let i = Math.max(CurrentPage - 2, 0); i < Math.min(CurrentPage + 2, pageCount - 1); i++) {
        let button = document.createElement("button")
        button.innerHTML = String(i + 1)
        button.onclick = () => { loadActivities(i) }
        container.appendChild(button)
    }

    if (CurrentPage < pageCount - 4) {
        let ellipses = document.createElement("p")
        ellipses.innerHTML = "..."
        container.appendChild(ellipses)
    }

    container.appendChild(nextArrow)
}

function loadActivities(currPage) {
    CurrentPage = currPage
    getItemCount().then((itemCount) => {
        console.log("Getting item count")
        document.getElementById("result-count").innerHTML = String(itemCount) + " total results"
        let pageCount = Math.ceil(itemCount / ItemsPerPage)
        setUpPaginationPageSelect(pageCount)
    })

    getPage(currPage, ItemsPerPage).then((activities) => {
        console.log("Getting items")
        populateTable(activities)
    })
}

function searchTermChanged(ev) {
    SearchTerm = ev.target.value
    let container = document.getElementById("page-content")
    container.innerHTML = ""
    loadActivities(0)
}

document.addEventListener("DOMContentLoaded", () => {
    SearchTerm = document.getElementById("search").value
    loadActivities(0)
    document.getElementById("search").addEventListener("keyup", searchTermChanged)
})