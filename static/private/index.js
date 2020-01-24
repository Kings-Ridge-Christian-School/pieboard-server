let groupdom = document.getElementById("groups");
let devicedom = document.getElementById("devices");
let dropArea = document.getElementById("dropBox");
let state, current, currentGroup, currentDevice, slideCache, deviceCache, groupCache

function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url);
        let json = await response.json()
        if (json.error) {
            if (json.error == "NotVerified") json.error = "Not verified, try reloading the page"
            alert("Error: " + json.error);
        } else {
            resolve(json);
        }
    });
}

function post(url, data) {
    return new Promise(async (resolve) => {
        let response = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });
        resolve(response.json());
    });
}

async function postWithResult(element, url, data) {
    element = document.getElementById(element);
    element.innerHTML = "⌛"
    try {
        let result = await post(url, data);
        if (result.error == false) {
            element.innerHTML = "✅"
            setTimeout(() => {element.innerHTML = "&nbsp;"}, 2000);
            return true
        } else {
            console.log(result);
            element.innerHTML = "❌"
            return false
        }
    } catch(e) {
        element.innerHTML = "❌"
        return false
    }
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

async function addDevice() {
    let res = await postWithResult("addDeviceStatus", "/api/device/new", {});
    if (res) {
        init_navigation();
    }
}

async function addGroup() {
    let res = await postWithResult("addGroupStatus", "/api/group/new", {});
    if (res) {
        init_navigation();
    }
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
})

function preventDefaults (e) {
    e.preventDefault();
    e.stopPropagation();
}

function findRadio(radios) {
    for (var i = 0, length = radios.length; i < length; i++) {
        if (radios[i].checked) {
          return(radios[i]);
          break;
        }
      }
}
function deselectRadio(radios) {
    for (var i = 0, length = radios.length; i < length; i++) {
        radios[i].checked = false
      }
}

dropArea.addEventListener('drop', handleDrop, false);

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function handleDrop(e) {
    let dt = e.dataTransfer
    let files = dt.files
    for (file_number in files) {
        let file = files[file_number]
        if (file.type != null) { 
            if (file.type.startsWith("image")) {
                await postWithResult("addSlideStatus", "/api/slide/new", {
                    "member": current,
                    "position": -1,
                    "name": file.name,
                    "data": await toBase64(file)
                })
            } else {
                alert("You can only upload images");
            }
        }
    }
    processGroupChange();
}

async function init_navigation() {
    let devices = await get("/api/devices");
    let groups = await get("/api/groups");
    
    devicedom.innerHTML = ""
    groupdom.innerHTML = ""
    groupCache = {}
    deviceCache = {}
    for (device in devices) {
        let container = document.createElement("div");
        let option = document.createElement("input");
        option.type = "radio"
        option.id = "dm_" + devices[device].id
        option.addEventListener("click", (elem) => {
            deselectRadio(devicedom)
            elem.target.checked = true
        });
        deviceCache[option.id] = devices[device].name
        let radioName = document.createElement("label");
        radioName.htmlFor = "dm_" + devices[device].id

        radioName.appendChild(document.createTextNode(devices[device].name))
        container.appendChild(option);
        container.appendChild(radioName)
        devicedom.appendChild(container);
    }
    for (group in groups) {
        let container = document.createElement("div");
        let option = document.createElement("input")
        option.type = "radio"
        option.id = "gm_" + groups[group].id
        option.addEventListener("click", (elem) => {
            deselectRadio(groupdom)
            elem.target.checked = true
        });
        groupCache[groups[group].id] = groups[group].name

        let radioName = document.createElement("label");
        radioName.htmlFor = "gm_" + groups[group].id

        radioName.appendChild(document.createTextNode(groups[group].name))
        container.appendChild(option);
        container.appendChild(radioName)
        groupdom.appendChild(container);
    }
}

function setImage(img) {
    images = document.getElementsByClassName("g_fig");
    for (image in images) {
        images[image].className = "g_fig"
    }
    if (img.target.id.startsWith("g")) {
        document.getElementById(img.target.id).className = "g_fig selected"
    } else {
        document.getElementById("g_figroupID_" + img.target.id).className = "g_fig selected"
    }
    let id = img.target.id.replace("g_figroupID_", "");
    document.getElementById("groupSlideID").innerHTML = id
    document.getElementById("groupSlideName").value = slideCache[id].name
    document.getElementById("groupSlideDisplayTime").value = slideCache[id].screentime
    document.getElementById("groupSlideName").disabled = false
    document.getElementById("groupSlideDisplayTime").disabled = false
    document.getElementById("saveSlideButton").disabled = false
}

async function processDeviceChange() {
    deselectRadio(groupdom)
    let id = findRadio(devicedom).id.replace("dm_", "");
    let data = await get("/api/device/" + id);
    if (data.lastSuccess == 0) {
        document.getElementById("lastCommunication").innerHTML = "❌ failed"
    } else if (data.lastSuccess == null) {
        document.getElementById("lastCommunication").innerHTML = "No communication"
    } else if (data.lastSuccess == -1) {
        document.getElementById("lastCommunication").innerHTML = "❌ password incorrect!"
    } else {
        document.getElementById("lastCommunication").innerHTML = "✅ " + new Date(data.lastSuccess).toLocaleString();
    }
    document.getElementById("deviceID").innerHTML = id
    document.getElementById("deviceIP").value = data.ip;
    document.getElementById("devicePort").value = data.port;
    document.getElementById("deviceName").value = data.name;
    document.getElementById("deviceAuth").value = data.authentication;
    document.getElementById("deviceGroupList").innerHTML = ""
    for (group in groupCache) {
        let container = document.createElement("div")
        let option = document.createElement("input");
        option.type = "checkbox"
        option.className = "g_select"
        option.id = "gid_" + group
        if (data.groups.includes(group)) {
            option.checked = 1
        }
        let optionLabel = document.createElement("label");
        optionLabel.htmlFor = "gid_" + group
        optionLabel.appendChild(document.createTextNode(groupCache[group]));
        container.appendChild(option);
        container.appendChild(optionLabel);
        document.getElementById("deviceGroupList").appendChild(container);
    }
    setState(1)
}

async function processGroupChange() {
        deselectRadio(devicedom);
        let id = findRadio(groupdom).id.replace("gm_", "");
        let data = await get("/api/group/" + id);
        let slides = data.slides
        slideCache = {}
        current = id;
        dropBox.innerHTML = "<h2>Slides</h2><p>Drag slides here</p><span class='status' id='addSlideStatus'></span>"
        for (slide in slides) {
            slideCache[slides[slide].id] = slides[slide]
            let figure = document.createElement("figure");
            let img = document.createElement("img");
            let capt = document.createElement("figcaption");
            figure.className = "g_fig"
            figure.id = "g_figroupID_" + slides[slide].id
            img.id = slides[slide].id
            capt.id = slides[slide].id
            img.setAttribute("src", slides[slide].data);
            capt.appendChild(document.createTextNode(slides[slide].name));

            figure.appendChild(img);
            figure.appendChild(capt);
            figure.addEventListener("click", setImage);
            dropBox.appendChild(figure);
        }
        document.getElementById("groupID").innerHTML = current
        document.getElementById("groupName").value = data.info.name
        if (data.info.expire == "0") {
            document.getElementById("groupExpireDate").disabled = true
            document.getElementById("groupExpireTime").disabled = true
            document.getElementById("groupExpireCheckbox").checked = true
        } else {
            let expire = new Date(data.info.expire)
            document.getElementById("groupExpireDate").value = expire.getFullYear() + "-" + (expire.getMonth()+1).toString().padStart(2, '0') + "-" + expire.getDate().toString().padStart(2, '0')
            document.getElementById("groupExpireTime").value = expire.getHours().toString().padStart(2, '0') + ":" + expire.getMinutes().toString().padStart(2, '0') + ":" + expire.getSeconds().toString().padStart(2, '0')
        }
        document.getElementById("groupExpireCheckbox").addEventListener("change", () => {

            document.getElementById("groupExpireDate").disabled = document.getElementById("groupExpireCheckbox").checked
            document.getElementById("groupExpireTime").disabled = document.getElementById("groupExpireCheckbox").checked
        });
        document.getElementById("groupSlideID").innerHTML = "None selected"
        document.getElementById("groupSlideName").value = ""
        document.getElementById("groupSlideDisplayTime").value = ""

        document.getElementById("groupSlideName").disabled = true
        document.getElementById("groupSlideDisplayTime").disabled = true
        document.getElementById("saveSlideButton").disabled = true
        setState(2);
}

async function saveDeviceData() {
    let groups = []
    for (group in groupCache) {
        if (document.getElementById("gid_" + group).checked) {
            groups.push(group.replace("gm_", ""));
        }
    }
    await postWithResult("saveDeviceStatus", "/api/device/edit", {
        "id": document.getElementById("deviceID").innerHTML,
        "name": document.getElementById("deviceName").value,
        "ip": document.getElementById("deviceIP").value,
        "port": document.getElementById("devicePort").value,
        "authentication": document.getElementById("deviceAuth").value,
        "groups": groups
    });
    processDeviceChange()
    await init_navigation()
    document.getElementById("dm_" + document.getElementById("deviceID").innerHTML).checked = true
}

async function saveGroupData() {
    if (document.getElementById("groupExpireCheckbox").checked) {
        time = 0
    } else {
        time = new Date(document.getElementById("groupExpireDate").value + " " + document.getElementById("groupExpireTime").value)
        
        }
    await postWithResult("saveGroupStatus", "/api/group/edit", {
        "id": document.getElementById("groupID").innerHTML,
        "name": document.getElementById("groupName").value,
        "expire": time
    });
    await init_navigation()
    document.getElementById("gm_" + document.getElementById("groupID").innerHTML).checked = true
}
async function saveSlideData() {
    await postWithResult("saveSlideStatus", "/api/slide/edit", {
        "id": document.getElementById("groupSlideID").innerHTML,
        "name": document.getElementById("groupSlideName").value,
        "screentime": document.getElementById("groupSlideDisplayTime").value
    });
    processGroupChange()
}

async function isReady() {
    devicedom.addEventListener("change", async () => processDeviceChange());
    groupdom.addEventListener("change", async () => processGroupChange());
    document.getElementById("saveDeviceButton").addEventListener("click", async => {saveDeviceData()});
    document.getElementById("saveGroupButton").addEventListener("click", async => {saveGroupData()});
    document.getElementById("saveSlideButton").addEventListener("click", async => {saveSlideData()});
    document.getElementById("addDeviceButton").addEventListener("click", async => {addDevice()});
    document.getElementById("addGroupButton").addEventListener("click", async => {addGroup()});

    await init_navigation(); 
    setState(0);
}