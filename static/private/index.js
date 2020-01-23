let groupdom = document.getElementById("groups");
let devicedom = document.getElementById("devices");
let dropArea = document.getElementById("dropBox");
let state, current, currentGroup, currentDevice, slideCache, deviceCache, groupCache

function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url);
        resolve(response.json());
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
    let res = await post("/api/device/new", {});
    if (res.res == 0) {
        init_navigation();
    }
}

async function addGroup() {
    let res = await post("/api/group/new", {});
    if (res.res == 0) {
        init_navigation();
    } else {

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
                await post("/api/slide/new", {
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
        let option = document.createElement("input");
        option.type = "radio"
        option.id = "dm_" + devices[device].id
        deviceCache[option.id] = devices[device].name
        devicedom.appendChild(option);
        devicedom.appendChild(document.createTextNode(devices[device].name));
    }
    for (group in groups) {
        let option = document.createElement("input")
        option.type = "radio"
        option.id = "gm_" + groups[group].id
        groupCache[option.id] = groups[group].name
        groupdom.appendChild(option);
        groupdom.appendChild(document.createTextNode(groups[group].name));
    }
}

function setImage(img) {
    console.log(img.target.id);
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
}

async function processDeviceChange() {
    deselectRadio(groupdom)
    let id = findRadio(devicedom).id.replace("dm_", "");
    let data = await get("/api/device/" + id);
    document.getElementById("deviceID").innerHTML = id
    document.getElementById("deviceIP").value = data.ip;
    document.getElementById("deviceName").value = data.name;
    for (group in groupCache) {
        let option = document.createElement("input");
        option.type = "checkbox"
        option.className = "g_select"
        option.id = "gid_" + group
        if (data.groups.includes(group)) {
            option.checked = 1
        }
        let option2 = document.createElement("span")
        option2.innerHTML = groupCache[group]
        document.getElementById("deviceGroupList").innerHTML = ""
        document.getElementById("deviceGroupList").appendChild(option);
        document.getElementById("deviceGroupList").appendChild(option2);
        document.getElementById("deviceGroupList").appendChild(document.createElement("br"));
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
        console.log(data);
        dropBox.innerHTML = "Drag images here"
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
            document.getElementById("groupExpire").disabled = true
            document.getElementById("groupExpireCheckbox").checked = true
        } else {
            document.getElementById("groupExpire").value = data.info.expire
        }
        document.getElementById("groupExpireCheckbox").addEventListener("change", () => {

            document.getElementById("groupExpire").disabled = document.getElementById("groupExpireCheckbox").checked
        });
        setState(2)
}

async function saveDeviceData() {
    let groups = []
    for (group in groupCache) {
        if (document.getElementById("gid_" + group).checked) {
            groups.push(group);
        }
    }
    await post("/api/device/edit", {
        "id": document.getElementById("deviceID").innerHTML,
        "name": document.getElementById("deviceName").value,
        "ip": document.getElementById("deviceIP").value,
        "groups": groups
    });
    processDeviceChange()
    init_navigation()
    document.getElementById("dm_" + document.getElementById("deviceID").innerHTML).checked = true
}

async function saveGroupData() {
    if (document.getElementById("groupExpireCheckbox").checked) {
        time = 0
    } else {
        time = document.getElementById("groupExpire").value
    }
    await post("/api/group/edit", {
        "id": document.getElementById("groupID").innerHTML,
        "name": document.getElementById("groupName").value,
        "expire": time
    });
    init_navigation()
    document.getElementById("gm_" + document.getElementById("groupID").innerHTML).checked = true
}
async function saveSlideData() {
    await post("/api/slide/edit", {
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

    init_navigation(); 
    setState(0);
}