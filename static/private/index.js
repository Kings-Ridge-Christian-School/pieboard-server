let groupdom = document.getElementById("groups")
let devicedom = document.getElementById("devices")
let dropArea = document.getElementById("dropBox")
let state, current, currentGroup, currentDevice, slideCache, deviceCache, groupCache

function get(url) {
    return new Promise(async (resolve) => {
        let response = await fetch(url)
        resolve(response.json())
    });
}
function post(url, data) {
    return new Promise(async (resolve) => {
        let response = await fetch(url, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
        });
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

async function addDevice() {
    let res = await post("/api/device/new", {});
    if (res.res == 0) {
        init_navigation()
    }
}

async function addGroup() {
    let res = await post("/api/group/new", {});
    if (res.res == 0) {
        init_navigation()
    } else {

    }
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false)
})

function preventDefaults (e) {
    e.preventDefault()
    e.stopPropagation()
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

dropArea.addEventListener('drop', handleDrop, false)

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
        let option = document.createElement("input")
        option.type = "radio"
        option.id = "dm_" + devices[device].id
        deviceCache[option.id] = devices[device].name
        devicedom.appendChild(option);
        devicedom.appendChild(document.createTextNode(devices[device].name))
    }
    for (group in groups) {
        let option = document.createElement("input")
        option.type = "radio"
        option.id = "gm_" + groups[group].id
        groupCache[option.id] = groups[group].name
        groupdom.appendChild(option);
        groupdom.appendChild(document.createTextNode(groups[group].name))
    }
}

function setImage(img) {
    console.log(img.target.id);
    images = document.getElementsByClassName("g_fig")
    for (image in images) {
        images[image].className = "g_fig"
    }
    if (img.target.id.startsWith("g")) {
        document.getElementById(img.target.id).className = "g_fig selected"
    } else {
        document.getElementById("g_fig_id_" + img.target.id).className = "g_fig selected"
    }
    let id = img.target.id.replace("g_fig_id_", "")
    document.getElementById("g_s_id").innerHTML = id
    document.getElementById("g_s_name").value = slideCache[id].name
    document.getElementById("g_s_dt").value = slideCache[id].screentime
}

async function processDeviceChange() {
    deselectRadio(groupdom)
    let id = findRadio(devicedom).id.replace("dm_", "");
    let data = await get("/api/device/" + id);
    document.getElementById("d_id").innerHTML = id
    document.getElementById("d_ip").value = data.ip;
    document.getElementById("d_name").value = data.name;
    for (group in groupCache) {
        let option = document.createElement("input")
        option.type = "checkbox"
        option.className = "g_select"
        option.id = "gid_" + group
        if (data.groups.includes(group)) {
            option.checked = 1
        }
        let option2 = document.createElement("span")
        option2.innerHTML = groupCache[group]
        document.getElementById("d_groups").innerHTML = ""
        document.getElementById("d_groups").appendChild(option)
        document.getElementById("d_groups").appendChild(option2)
        document.getElementById("d_groups").appendChild(document.createElement("br"))
    }
    setState(1)
}

async function processGroupChange() {
        deselectRadio(devicedom)
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
            figure.id = "g_fig_id_" + slides[slide].id
            img.id = slides[slide].id
            capt.id = slides[slide].id
            img.setAttribute("src", slides[slide].data);
            capt.appendChild(document.createTextNode(slides[slide].name));

            figure.appendChild(img);
            figure.appendChild(capt);
            figure.addEventListener("click", setImage);
            dropBox.appendChild(figure);
        }
        document.getElementById("g_id").innerHTML = current
        document.getElementById("g_name").value = data.info.name
        if (data.info.expire == "0") {
            document.getElementById("g_e").disabled = true
            document.getElementById("g_e_c").checked = true
        } else {
            document.getElementById("g_e").value = data.info.expire
        }
        document.getElementById("g_e_c").addEventListener("change", () => {

            document.getElementById("g_e").disabled = document.getElementById("g_e_c").checked
        });
        setState(2)
}

async function saveDeviceData() {
    groups = []
    for (group in groupCache) {
        if (document.getElementById("gid_" + group).checked) {
            groups.push(group);
        }
    }
    await post("/api/device/edit", {
        "id": document.getElementById("d_id").innerHTML,
        "name": document.getElementById("d_name").value,
        "ip": document.getElementById("d_ip").value,
        "groups": groups
    });
    processDeviceChange()
    init_navigation()
    document.getElementById("dm_" + document.getElementById("d_id").innerHTML).checked = true
}

async function saveGroupData() {
    if (document.getElementById("g_e_c").checked) {
        time = 0
    } else {
        time = document.getElementById("g_e").value
    }
    await post("/api/group/edit", {
        "id": document.getElementById("g_id").innerHTML,
        "name": document.getElementById("g_name").value,
        "expire": time
    });
    init_navigation()
    document.getElementById("gm_" + document.getElementById("g_id").innerHTML).checked = true
}
async function saveSlideData() {
    await post("/api/slide/edit", {
        "id": document.getElementById("g_s_id").innerHTML,
        "name": document.getElementById("g_s_name").value,
        "screentime": document.getElementById("g_s_dt").value
    });
    processGroupChange()
}

async function isReady() {
    devicedom.addEventListener("change", async () => processDeviceChange());
    groupdom.addEventListener("change", async () => processGroupChange());

    init_navigation(); 
    setState(0);
}