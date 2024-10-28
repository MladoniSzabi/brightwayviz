var ItemsPerPage = 5
var CurrentPage = 0
var TotalItems = 0

function getFilters() {
    timePeriodStart = document.getElementById("time-period-start")
    timePeriodEnd = document.getElementById("time-period-end")
    sector = document.getElementById("sector")
    geography = document.getElementById("geography")
    activityType = document.getElementById("activity-type")
    isicSection = document.getElementById("isic-section")
    isicClass = document.getElementById("isic-class")
    cpcClass = document.getElementById("cpc-class")
    searchTerm = document.getElementById("search")
    organisation = document.getElementById("organisation-filter")

    form = new FormData();

    if (timePeriodStart.value) {
        form.append("time-period-start", timePeriodStart.value)
    }
    if (timePeriodEnd.value) {
        form.append("time-period-end", timePeriodEnd.value)
    }
    if (sector.value) {
        form.append("sector", sector.value)
    }
    if (geography.value) {
        form.append("geography", geography.value)
    }
    if (activityType.value) {
        form.append("activity-type", activityType.value)
    }
    if (isicSection.value) {
        form.append("isic-section", isicSection.value)
    }
    if (isicClass.value) {
        form.append("isic-class", isicClass.value)
    }
    if (cpcClass.value) {
        form.append("cpc-class", cpcClass.value)
    }

    if (searchTerm.value) {
        form.append("search", searchTerm.value)
    }
    if (organisation.value) {
        form.append("organisation", organisation.value)
    }

    return form
}

function setPageSize(ev) {
    ItemsPerPage = Number(ev.target.value)
    searchChanged(ev)
}

async function getItemCount() {
    let form = getFilters()
    let urlParams = new URLSearchParams(form)
    let response = await fetch(`/api/activity/total?${urlParams.toString()}`)
    if (response.status != 200) {
        // error
    }
    TotalItems = Number(await response.text())
    return TotalItems
}

async function getPage(pageNumber, itemsPerPage) {
    let form = getFilters()
    form.append('page', pageNumber)
    form.append('count', itemsPerPage)
    let urlParams = new URLSearchParams(form)
    let response = await fetch(`/api/activity?${urlParams.toString()}`)
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
            cells[key].textContent = String(activity[key])
        }

        if (cells["organisations"].textContent.length > 15) {
            console.log(1)
            cells["organisations"].textContent = cells["organisations"].textContent.slice(0, 13) + "..."
        }

        cells["organisations"].textContent = cells["organisations"].textContent

        row.appendChild(cells["name"])
        row.appendChild(cells["product"])
        row.appendChild(cells["unit"])
        row.appendChild(cells["location"])
        row.appendChild(cells["type"])
        row.appendChild(cells["organisations"])

        let showButton = document.createElement("a")
        showButton.textContent = "Show"
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
    prevArrow.textContent = "<"
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
    nextArrow.textContent = ">"
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
        ellipses.textContent = "..."
        container.appendChild(ellipses)
    }

    for (let i = Math.max(CurrentPage - 2, 0); i < Math.min(CurrentPage + 2, pageCount); i++) {
        let button = document.createElement("button")
        button.textContent = String(i + 1)
        button.onclick = () => { loadActivities(i) }
        container.appendChild(button)
    }

    if (CurrentPage < pageCount - 3) {
        let ellipses = document.createElement("p")
        ellipses.textContent = "..."
        container.appendChild(ellipses)
    }

    container.appendChild(nextArrow)
}

function loadActivities(currPage) {
    CurrentPage = currPage
    getItemCount().then((itemCount) => {
        document.getElementById("result-count").textContent = String(itemCount) + " total results"
        let pageCount = Math.ceil(itemCount / ItemsPerPage)
        setUpPaginationPageSelect(pageCount)
    })

    getPage(currPage, ItemsPerPage).then((activities) => {
        populateTable(activities)
    })
}

function searchChanged(ev) {
    console.log(1)
    let container = document.getElementById("page-content")
    container.innerHTML = ""
    loadActivities(0)
}

document.addEventListener("DOMContentLoaded", () => {
    ItemsPerPage = Number(document.getElementById("pagination-item-count").value)
    loadActivities(0)
    document.getElementById("search").addEventListener("input", searchChanged)
    document.getElementById("time-period-start").addEventListener("input", searchChanged)
    document.getElementById("time-period-end").addEventListener("input", searchChanged)
    document.getElementById("sector").addEventListener("input", searchChanged)
    document.getElementById("geography").addEventListener("input", searchChanged)
    document.getElementById("activity-type").addEventListener("input", searchChanged)
    document.getElementById("isic-section").addEventListener("input", searchChanged)
    document.getElementById("isic-class").addEventListener("input", searchChanged)
    document.getElementById("cpc-class").addEventListener("input", searchChanged)
    document.getElementById("search").addEventListener("input", searchChanged)
    document.getElementById("organisation-filter").addEventListener("input", searchChanged)

    document.getElementById("pagination-item-count").addEventListener("change", setPageSize)
})