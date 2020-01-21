(async () => { // thanks js
    let groupdom = document.getElementById("groups")
    let devicedom = document.getElementById('devices')
    let state = 0
    function get(url) {
        return new Promise(async (resolve) => {
            response = await fetch(url)
            resolve(response.json())
        });
    }
    
    function setState(type) {
        if (type == 1) {
            document.getElementById("deviceConfiguration").style.display = "block"
            document.getElementById("groupConfiguration").style.display = "none"
            document.getElementById("placeholder").style.display = "none"
            document.getElementById("deviceConfigurationNav").style.display = "block"
            document.getElementById("groupConfigurationNav").style.display = "none"
            document.getElementById("placeholderNav").style.display = "none"
        }
        if (type == 2) {
            document.getElementById("groupConfiguration").style.display = "block"
            document.getElementById("deviceConfiguration").style.display = "none"
            document.getElementById("placeholder").style.display = "none"
            document.getElementById("groupConfigurationNav").style.display = "block"
            document.getElementById("deviceConfigurationNav").style.display = "none"
            document.getElementById("placeholderNav").style.display = "none"
        }
        if (type == 0) {
            document.getElementById("placeholder").style.display = "block"
            document.getElementById("groupConfiguration").style.display = "none"
            document.getElementById("deviceConfiguration").style.display = "none"
            document.getElementById("placeholderNav").style.display = "block"
            document.getElementById("groupConfigurationNav").style.display = "none"
            document.getElementById("deviceConfigurationNav").style.display = "none"
        }
        state = type
    }
    setState(0)
    
    let devices = await get("/api/devices")
    let groups = await get("/api/groups")
    
    for (device in devices) {
        let option = document.createElement("option")
        option.id = devices[device].id
        option.text = devices[device].name
        devicedom.add(option)
    }
    
    for (group in groups) {
        let option = document.createElement("option")
        option.id = groups[group].id
        option.text = groups[group].name
        groupdom.add(option)
    }
    
    
    
    devicedom.addEventListener("change", async () => {
        let id = devicedom.options[devicedom.selectedIndex].id
        data = await get("/api/device/" + id)
        setState(1)
    })
    
    groupdom.addEventListener("change", async () => {
        let id = groupdom.options[groupdom.selectedIndex].id
        data = await get("/api/group/" + id)
        setState(2)
    })
    
    
})();