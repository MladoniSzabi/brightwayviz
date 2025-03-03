function loadSideBar() {
    const sidebar = document.getElementById("sidebar");

    if (urlParams.get("database")) {
        DATABASE = urlParams.get("database")
    } else if (localStorage.getItem("database")) {
        DATABASE = localStorage.getItem("database")
    }

    if (localStorage.getItem("graphType")) {
        GRAPH_TYPE = localStorage.getItem("graphType")
    }

    if (localStorage.getItem("ttradius")) {
        TIDY_TREE_RADIUS = parseInt(localStorage.getItem("ttradius"))
    }

    if (localStorage.getItem("graphColouring")) {
        GRAPH_COLOURING = localStorage.getItem("graphColouring")
    }

    const dbSelect = document.getElementById("sidebar-database").getElementsByTagName("select")[0]
    const graphTypeSelect = document.getElementById("sidebar-graph").getElementsByTagName("select")[0]
    const radiusInput = document.getElementById("sidebar-radius").getElementsByTagName("input")[0]
    const colourInput = document.getElementById("sidebar-colouring").getElementsByTagName("input")[0]

    dbSelect.value = DATABASE
    graphTypeSelect.value = GRAPH_TYPE
    radiusInput.value = TIDY_TREE_RADIUS
    colourInput.checked = GRAPH_COLOURING != "tags"

    dbSelect.onchange = (ev) => {
        DATABASE = ev.target.value
        localStorage.setItem("database", ev.target.value)
    }

    graphTypeSelect.onchange = (ev) => {
        GRAPH_TYPE = ev.target.value
        localStorage.setItem("graphType", ev.target.value)
    }

    radiusInput.onchange = (ev) => {
        TIDY_TREE_RADIUS = parseInt(ev.target.value)
        localStorage.setItem("ttradius", TIDY_TREE_RADIUS)
    }

    colourInput.onchange = (ev) => {
        GRAPH_COLOURING = ev.target.checked ? "layers" : "tags"
        localStorage.setItem("graphColouring", GRAPH_COLOURING)
    }

    const closeButton = document.getElementById("sidebar-close")
    closeButton.addEventListener("click", (ev) => { sidebar.classList.add("close") })

    const openButton = document.getElementById("sidebar-open")
    openButton.addEventListener("click", (ev) => { sidebar.classList.remove("close") })
}