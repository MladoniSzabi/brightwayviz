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

    console.log(DATABASE, GRAPH_TYPE)

    const dbSelect = document.getElementById("sidebar-database").getElementsByTagName("select")[0]
    const graphTypeSelect = document.getElementById("sidebar-graph").getElementsByTagName("select")[0]

    dbSelect.value = DATABASE
    graphTypeSelect.value = GRAPH_TYPE

    dbSelect.onchange = (ev) => {
        DATABASE = ev.target.value
        localStorage.setItem("database", ev.target.value)
    }

    graphTypeSelect.onchange = (ev) => {
        console.log(ev.target.value)
        GRAPH_TYPE = ev.target.value
        localStorage.setItem("graphType", ev.target.value)
    }

    const closeButton = document.getElementById("sidebar-close")
    closeButton.addEventListener("click", (ev) => { sidebar.classList.add("close") })

    const openButton = document.getElementById("sidebar-open")
    openButton.addEventListener("click", (ev) => { sidebar.classList.remove("close") })
}