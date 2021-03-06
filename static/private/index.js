let slideshowdom = document.getElementById("slideshows");
let groupdom = document.getElementById("groups");
let devicedom = document.getElementById("devices");
let dropArea = document.getElementById("dropBox");
let state, current, currentSlideshow, currentDevice, slideCache, deviceCache, slideshowCache, slideRestartCache, blockLock
let internalDrag = false
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
function blockAccess() {
    let blockLockSelf = Math.random()
    blockLock = blockLockSelf
    document.getElementById("loader").style.display = "block"
    setTimeout(() => {
        if (blockLock == blockLockSelf) {
            if (confirm("The server isn't responding, would you like to reload?")) {
                location.reload()
            }
        }
    }, 10000);
}

function allowAccess() {
    blockLock = null
    document.getElementById("loader").style.display = "none"
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
            element.innerHTML = "❌ " + result.error
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
        document.getElementById("slideshowConfiguration").style.display = "none"
        document.getElementById("placeholder").style.display = "none"
        document.getElementById("groupConfiguration").style.display = "none"
        document.getElementById("deviceConfigurationNav").style.display = "block"
        document.getElementById("slideshowConfigurationNav").style.display = "none"
        document.getElementById("placeholderNav").style.display = "none"
        document.getElementById("groupConfigurationNav").style.display = "none"
    }
    if (type == 2) {
        document.getElementById("slideshowConfiguration").style.display = "block"
        document.getElementById("deviceConfiguration").style.display = "none"
        document.getElementById("placeholder").style.display = "none"
        document.getElementById("groupConfiguration").style.display = "none"
        document.getElementById("slideshowConfigurationNav").style.display = "block"
        document.getElementById("deviceConfigurationNav").style.display = "none"
        document.getElementById("placeholderNav").style.display = "none"
        document.getElementById("groupConfigurationNav").style.display = "none"
    }
    if (type == 3) {
        document.getElementById("slideshowConfiguration").style.display = "none"
        document.getElementById("deviceConfiguration").style.display = "none"
        document.getElementById("placeholder").style.display = "none"
        document.getElementById("groupConfiguration").style.display = "block"
        document.getElementById("slideshowConfigurationNav").style.display = "none"
        document.getElementById("deviceConfigurationNav").style.display = "none"
        document.getElementById("placeholderNav").style.display = "none"
        document.getElementById("groupConfigurationNav").style.display = "block"
    }
    if (type == 0) {
        document.getElementById("placeholder").style.display = "block"
        document.getElementById("slideshowConfiguration").style.display = "none"
        document.getElementById("deviceConfiguration").style.display = "none"
        document.getElementById("placeholderNav").style.display = "block"
        document.getElementById("groupConfiguration").style.display = "none"
        document.getElementById("slideshowConfigurationNav").style.display = "none"
        document.getElementById("deviceConfigurationNav").style.display = "none"
        document.getElementById("groupConfigurationNav").style.display = "none"
    }
    state = type
}

async function addDevice() {
    let res = await postWithResult("addDeviceStatus", "/api/device/new", {});
    if (res) {
        setState(0);
        init_navigation();
    }
}

async function addSlideshow() {
    let res = await postWithResult("addSlideshowStatus", "/api/slideshow/new", {});
    if (res) {
        setState(0);
        init_navigation();
    }
}

async function addGroup() {
    let res = await postWithResult("addGroupStatus", "/api/group/new", {});
    if (res) {
        setState(0);
        init_navigation();
    }
}

async function deleteDevice() {
    let device = findRadio(devicedom).id.replace("dm_", "");
    if (confirm("Are you sure you want to delete device " + device + "? This is irreversable!")) {
        res = await postWithResult("addDeviceStatus", "/api/device/delete", {"id": device});
        if (res) {
            setState(0);
            init_navigation();
        }
    }
}

async function deleteSlideshow() {
    let slideshow = findRadio(slideshowdom).id.replace("gm_", "");
    if (confirm("Are you sure you want to delete slideshow " + slideshow + "? It's slides will be deleted as well. This is irreversable!")) {
        res = await postWithResult("addSlideshowStatus", "/api/slideshow/delete", {"id": slideshow});
        if (res) {
            setState(0);
            init_navigation();
        }
    }
}

async function deleteGroup() {
    let group = findRadio(groupdom).id.replace("mm_", "");
    if (confirm("Are you sure you want to delete group " + group + "? Each device will remain on the same slideshows, but will be ungrouped!")) {
        res = await postWithResult("addGroupStatus", "/api/group/delete", {"id": group});
        if (res) {
            setState(0);
            init_navigation();
        }
    }
}

async function deleteSlide() {
    let slide = document.getElementById("slideshowSlideID").innerHTML
    if (confirm("Are you sure you want to delete slide " + slide + "? This is irreversable!")) {
        res = await postWithResult("addSlideshowStatus", "/api/slide/delete", {"id": slide, "member": document.getElementById("slideshowID").innerHTML});
        if (res) {
            delete slideRestartCache.slides[slide]
            slideRestartCache.order = slideRestartCache.order.filter(function(item) {
                return item !== slide
            })
            processSlideshowChange(true);
            init_navigation();
        }
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
      return radios[0]
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
    function resizedataURL(datas, wantedWidth, wantedHeight) { // https://stackoverflow.com/questions/20958078/resize-a-base-64-image-in-javascript-without-using-canvas
        return new Promise((resolve) => {
            var img = new Image(); 
            img.onload = function()
                {        
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');
                    canvas.width = wantedWidth;
                    canvas.height = wantedHeight;
                    ctx.drawImage(this, 0, 0, wantedWidth, wantedHeight);
    
                    var dataURI = canvas.toDataURL();
                    resolve(dataURI);
                };
            img.src = datas;
        });
    }

    if (internalDrag == false) {
        let dt = e.dataTransfer
        let files = dt.files
        document.getElementById("addSlideStatus").innerHTML =  `0/${files.length} Uploaded`
        for (file_number in files) {
            let file = files[file_number]
            if (file.type != null) { 
                if (file.type.startsWith("image") || file.type.startsWith("video")) {
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append("member", current)

                    await new Promise((resolve, reject) => {
                        fetch('/api/slide/new', {
                            method: 'POST',
                            body: formData
                        }).then((res) => {
                            document.getElementById("addSlideStatus").innerHTML = `${file_number}/${files.length} Uploaded`
                            resolve()
                        })
                    });
                } else {
                    alert("You can only upload images");
                }
            }
        }
        processSlideshowChange(false);
    }
}

function onDragStart(e) {
    internalDrag = e.target;
}

function onDragEnd(e) {
    internalDrag = false
    let dragZones = document.getElementsByClassName("dropvisible")
    for (let zone of dragZones) {
        zone.className = "dropzone"
    }
}

function handleOver(e) {
    if (internalDrag != false) {
        let myID = e.target.id.split("_")[2]
        if (internalDrag._id != myID && internalDrag._id + 1 != myID) e.target.className = "dropvisible"
    }
}
function handleLeave(e) {
    e.target.className = "dropzone"
}

async function handleMove(e) {
    let origin = internalDrag._id
    let final = e.target.id.split("_")[2]
    if (origin < final) final--
    await postWithResult("addSlideStatus", "/api/slide/move", {
        "originalPos": origin,
        "newPos": final,
        "slideshow": current
    });
    processSlideshowChange(false)
}

async function init_navigation() {
    let devices = await get("/api/devices");
    let slideshows = await get("/api/slideshows");
    let groups = await get("/api/groups");
    
    devicedom.innerHTML = ""
    slideshowdom.innerHTML = ""
    groupdom.innerHTML = ""
    slideshowCache = {}
    deviceCache = {}
    groupCache = {}
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
    for (slideshow in slideshows) {
        let container = document.createElement("div");
        let option = document.createElement("input")
        option.type = "radio"
        option.id = "gm_" + slideshows[slideshow].id
        option.addEventListener("click", (elem) => {
            deselectRadio(slideshowdom)
            elem.target.checked = true
        });
        slideshowCache[slideshows[slideshow].id] = slideshows[slideshow].name

        let radioName = document.createElement("label");
        radioName.htmlFor = "gm_" + slideshows[slideshow].id

        radioName.appendChild(document.createTextNode(slideshows[slideshow].name))
        container.appendChild(option);
        container.appendChild(radioName)
        slideshowdom.appendChild(container);
    }
    for (group in groups) {
        let container = document.createElement("div");
        let option = document.createElement("input")
        option.type = "radio"
        option.id = "mm_" + groups[group].id
        option.addEventListener("click", (elem) => {
            deselectRadio(groupdom)
            elem.target.checked = true
        });
        groupCache[groups[group].id] = groups[group].name

        let radioName = document.createElement("label");
        radioName.htmlFor = "mm_" + groups[group].id

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
        document.getElementById("g_fislideshowID_" + img.target.id).className = "g_fig selected"
    }

    console.log(slideCache[img.target.id])

    if (slideCache[img.target.id].expire == "0") {
        document.getElementById("slideExpireDate").disabled = true
        document.getElementById("slideExpireTime").disabled = true
        document.getElementById("slideExpireDate").value = null
        document.getElementById("slideExpireTime").value = null
        document.getElementById("slideExpireCheckbox").checked = true
    } else {
        let expire = new Date(slideCache[img.target.id].expire)
        document.getElementById("slideExpireDate").disabled = false
        document.getElementById("slideExpireTime").disabled = false
        document.getElementById("slideExpireCheckbox").checked = false
        document.getElementById("slideExpireDate").value = expire.getFullYear() + "-" + (expire.getMonth()+1).toString().padStart(2, '0') + "-" + expire.getDate().toString().padStart(2, '0')
        document.getElementById("slideExpireTime").value = expire.getHours().toString().padStart(2, '0') + ":" + expire.getMinutes().toString().padStart(2, '0') + ":" + expire.getSeconds().toString().padStart(2, '0')
    }
    document.getElementById("slideExpireCheckbox").addEventListener("change", () => {

        document.getElementById("slideExpireDate").disabled = document.getElementById("slideExpireCheckbox").checked
        document.getElementById("slideExpireTime").disabled = document.getElementById("slideExpireCheckbox").checked
    });

    if (slideCache[img.target.id].type == "video") {
        document.getElementById("slideAudio").style.display = "block"
        document.getElementById("slideTime").style.display = "none"
        document.getElementById("slideAudioSlider").value = slideCache[img.target.id].volume
        document.getElementById("slideAudioValue").innerHTML = `${document.getElementById("slideAudioSlider").value}%`
    } else {
        document.getElementById("slideAudio").style.display = "none"
        document.getElementById("slideTime").style.display = "block"
    }

    let id = img.target.id.replace("g_fislideshowID_", "");
    document.getElementById("slideshowSlideID").innerHTML = id
    document.getElementById("slideshowSlideName").value = slideCache[id].name
    document.getElementById("slideshowSlideDisplayTime").value = slideCache[id].screentime
    document.getElementById("slideshowSlidePosition").value = slideCache[id].position+1
    document.getElementById("slideshowSlideName").disabled = false
    document.getElementById("slideshowSlideDisplayTime").disabled = false
    document.getElementById("saveSlideButton").disabled = false
    document.getElementById("deleteSlideButton").disabled = false
    document.getElementById("slideshowSlidePosition").disabled = false
    document.getElementById("slideAudioSlider").disabled = false
}

function slideshowProcess(elem, slideshows, name) { 
    for (slideshow in slideshowCache) {
        let container = document.createElement("div")
        let option = document.createElement("input");
        option.type = "checkbox"
        option.className = "g_select"
        option.id = name + "id_" + slideshow
        if (slideshows.includes(slideshow)) {
            option.checked = 1
        }
        let optionLabel = document.createElement("label");
        optionLabel.htmlFor = name + "id_" + slideshow
        optionLabel.appendChild(document.createTextNode(slideshowCache[slideshow]));
        container.appendChild(option);
        container.appendChild(optionLabel);
        document.getElementById(elem).appendChild(container);
    }
}

async function processDeviceChange() {
    blockAccess()
    deselectRadio(slideshowdom)
    deselectRadio(groupdom)
    let id = findRadio(devicedom).id.replace("dm_", "");
    let data = await get("/api/device/" + id);
    refreshDevice()
    document.getElementById("deviceID").innerHTML = id
    document.getElementById("deviceIP").value = data.ip;
    document.getElementById("devicePort").value = data.port;
    document.getElementById("deviceName").value = data.name;
    document.getElementById("deviceAuth").value = data.authentication;
    document.getElementById("deviceSlideshowList").innerHTML = ""
    console.log(data)
    slideshowProcess("deviceSlideshowList", data.slideshows, "g")
    if (data.devgroup != null) {
        let warning = document.createElement("i")
        warning.appendChild(document.createTextNode("This device is in a group, its slideshows cannot be changed here unless removed from the group"));
        document.getElementById("deviceSlideshowList").prepend(warning)
        for (let slideshow in slideshowCache) {
            document.getElementById("gid_" + slideshow).disabled = true
        }
    }
    setState(1)
    allowAccess()
}

async function processSlideshowChange(useCache) {
        blockAccess()
        deselectRadio(devicedom);
        deselectRadio(groupdom);
        let id = findRadio(slideshowdom).id.replace("gm_", "");
        dropBox.innerHTML = "<h2>Slides</h2><p>Drag slides here</p><span class='status' id='addSlideStatus'>Loading...</span>"
        setState(2);
        let data = useCache && slideRestartCache != null ? slideRestartCache : await get("/api/slideshow/" + id);
        if (!useCache) slideRestartCache = data
        let slides = data.slides
        slideCache = {}
        current = id;
        // note: same as content below, change both
        let dropZone = document.createElement("p")
        dropZone.className = 'dropzone'
        dropZone.id = 'g_post_' + 0
        dropZone.addEventListener('dragover', handleOver, false);
        dropZone.addEventListener('dragleave', handleLeave, false);
        dropZone.addEventListener('drop', handleMove, false);
        dropZone.appendChild(document.createTextNode("Move here"));
        dropBox.appendChild(dropZone)
        let i = 0;
        for (let slide of data.order) {
            slideCache[slide] = slides[slide]
            slideCache[slide].position = i
            let figure = document.createElement("figure");
            let img = document.createElement(slides[slide].type == "image" ? "img" : "video");
            img.style.height = "100px"
            let capt = document.createElement("figcaption");
            figure.className = "g_fig"
            figure.id = "g_fislideshowID_" + slide
            figure._id = i
            img.id = slide
            capt.id = slide
            img.setAttribute("loading", "lazy")
            if (slides[slide].type == "image") img.setAttribute("src", `/api/slide/thumbnail/${slides[slide].hash}.${slides[slide].extension}`);
            else img.setAttribute("src", `/api/slide/get/${slides[slide].hash}.${slides[slide].extension}`);
            capt.appendChild(document.createTextNode(slides[slide].name));

            figure.appendChild(img);
            figure.appendChild(capt);
            figure.addEventListener("click", setImage);
            figure.setAttribute("draggable", true);
            img.setAttribute("draggable", false);
            figure.addEventListener("dragstart", onDragStart, false);
            figure.addEventListener("dragend", onDragEnd, false);
            dropBox.appendChild(figure);

            i++ // added here because the dropZone is for the post after

            let dropZone = document.createElement("p")
            dropZone.className = 'dropzone'
            dropZone.id = 'g_post_' + i
            dropZone.addEventListener('dragover', handleOver, false);
            dropZone.addEventListener('dragleave', handleLeave, false);
            dropZone.addEventListener('drop', handleMove, false);
            dropZone.appendChild(document.createTextNode("Move here"));
            dropBox.appendChild(dropZone)
        }
        document.getElementById("addSlideStatus").innerHTML = ""
        document.getElementById("slideshowID").innerHTML = current
        document.getElementById("slideshowName").value = data.name
        if (data.expire == "0") {
            document.getElementById("slideshowExpireDate").disabled = true
            document.getElementById("slideshowExpireTime").disabled = true
            document.getElementById("slideshowExpireCheckbox").checked = true
            document.getElementById("slideshowExpireDate").value = null
            document.getElementById("slideshowExpireTime").value = null
        } else {
            let expire = new Date(data.info.expire)
            document.getElementById("slideshowExpireDate").disabled = false
            document.getElementById("slideshowExpireTime").disabled = false
            document.getElementById("slideshowExpireCheckbox").checked = false
            document.getElementById("slideshowExpireDate").value = expire.getFullYear() + "-" + (expire.getMonth()+1).toString().padStart(2, '0') + "-" + expire.getDate().toString().padStart(2, '0')
            document.getElementById("slideshowExpireTime").value = expire.getHours().toString().padStart(2, '0') + ":" + expire.getMinutes().toString().padStart(2, '0') + ":" + expire.getSeconds().toString().padStart(2, '0')
        }
        document.getElementById("slideshowExpireCheckbox").addEventListener("change", () => {

            document.getElementById("slideshowExpireDate").disabled = document.getElementById("slideshowExpireCheckbox").checked
            document.getElementById("slideshowExpireTime").disabled = document.getElementById("slideshowExpireCheckbox").checked
        });
        document.getElementById("slideshowSlideID").innerHTML = "None selected"
        document.getElementById("slideshowSlideName").value = ""
        document.getElementById("slideshowSlideDisplayTime").value = ""

        document.getElementById("slideshowSlideName").disabled = true
        document.getElementById("slideshowSlideDisplayTime").disabled = true
        document.getElementById("saveSlideButton").disabled = true
        document.getElementById("deleteSlideButton").disabled = true
        document.getElementById("slideshowSlidePosition").disabled = true
        document.getElementById("slideExpireDate").disabled = true
        document.getElementById("slideExpireTime").disabled = true
        document.getElementById("slideAudioSlider").disabled = true
        document.getElementById("slideExpireDate").value = null
        document.getElementById("slideExpireTime").value = null
        document.getElementById("slideExpireCheckbox").checked = true
        allowAccess()
}

async function processGroupChange() {
    blockAccess()
    deselectRadio(devicedom);
    deselectRadio(slideshowdom);
    let id = findRadio(groupdom).id.replace("mm_", "");
    let data = await get("/api/group/" + id);
    document.getElementById("deviceList").innerHTML = ""
    for (let device of data.devices) {
        let container = document.createElement("div")
        let option = document.createElement("input");
        option.type = "checkbox"
        option.className = "m_select"
        option.id = "mid_" + device.id
        if (device.devgroup == id) {
            option.checked = 1
        } else if (device.devgroup != null) {
            option.disabled = true
        }
        let optionLabel = document.createElement("label");
        optionLabel.htmlFor = "mid_" + slideshow
        optionLabel.appendChild(document.createTextNode(device.name));
        if (data.devgroup != null) {
            option.disabled = true
            optionLabel.disabled = true
        }
        container.appendChild(option);
        container.appendChild(optionLabel);
        document.getElementById("deviceList").appendChild(container);
    }
    document.getElementById("groupID").innerHTML = id
    document.getElementById("groupName").value = data.name;
    document.getElementById("groupSlideshowList").innerHTML = ""
    slideshowProcess("groupSlideshowList", data.slideshows, "z")
    setState(3)
    allowAccess()
}

async function refreshDevice() {
    document.getElementById("devInfoBox").style.display = "none"
    let id = findRadio(devicedom).id.replace("dm_", "");
    document.getElementById("lastCommunication").innerHTML = "⌛ Checking"
    let data = await get("/api/device/test/" + id);
    if (data.devError == false) {
        if (data.response.error) {
            document.getElementById("lastCommunication").innerHTML = "❌ password incorrect!"
        } else {
            document.getElementById("devInfoBox").style.display = "block"
            document.getElementById("lastCommunication").innerHTML = "✅ Successful"
            let warnings = ""
            for (let warning of data.response.warns) {
                switch(warning) {
                    case "NOPASSWORD":
                        warnings += "⚠️ No password set<br>"
                        break;
                    case "NOSLIDE":
                        warnings += "⚠️ No slides loaded<br>"
                        break;
                    case "CPROC":
                        warnings += "⚠️ Currently loading slides<br>"
                        break;
                }
            }
            if (warnings == "") warnings = "✅ None<br>"
            document.getElementById("deviceWarnings").innerHTML = warnings
            document.getElementById("successTime").innerHTML = new Date().toLocaleString()
        }
    } else {
        document.getElementById("lastCommunication").innerHTML = `❌ failed (last checked at ${new Date(-1*data.response).toLocaleString()}`
    }
}

async function rebootDevice() {
    if (confirm('Are you sure you want to reboot the device?')) {
        await postWithResult("saveDeviceStatus", "/api/device/reboot", {
            id: document.getElementById("deviceID").innerHTML
        });
    }
}

async function saveDeviceData() {
    let slideshows = []
    for (slideshow in slideshowCache) {
        if (document.getElementById("gid_" + slideshow).checked) {
            slideshows.push(slideshow.replace("gm_", ""));
        }
    }
    await postWithResult("saveDeviceStatus", "/api/device/edit", {
        "id": document.getElementById("deviceID").innerHTML,
        "name": document.getElementById("deviceName").value,
        "ip": document.getElementById("deviceIP").value,
        "port": document.getElementById("devicePort").value,
        "authentication": document.getElementById("deviceAuth").value,
        "slideshows": slideshows
    });
    processDeviceChange()
    await init_navigation()
    document.getElementById("dm_" + document.getElementById("deviceID").innerHTML).checked = true
}

async function saveSlideshowData() {
    if (document.getElementById("slideshowExpireCheckbox").checked) {
        time = 0
    } else {
        time = new Date(document.getElementById("slideshowExpireDate").value + " " + document.getElementById("slideshowExpireTime").value)
        
        }
    await postWithResult("saveSlideshowStatus", "/api/slideshow/edit", {
        "id": document.getElementById("slideshowID").innerHTML,
        "name": document.getElementById("slideshowName").value,
        "expire": time
    });
    await init_navigation()
    document.getElementById("gm_" + document.getElementById("slideshowID").innerHTML).checked = true
}
async function saveGroupData() {
    let slideshows = []
    for (slideshow in slideshowCache) {
        if (document.getElementById("zid_" + slideshow).checked) {
            console.log(document.getElementById("zid_" + slideshow))
            slideshows.push(slideshow.replace("gm_", ""));
        }
    }
    let devices = []
    console.log(deviceCache)
    for (device in deviceCache) {
        if (document.getElementById("mid_" + device.split("_")[1]).checked) {
            devices.push(device.split("_")[1]);
        }
    }
    console.log(slideshows, devices)

    await postWithResult("saveGroupStatus", "/api/group/edit", {
        "id": document.getElementById("groupID").innerHTML,
        "name": document.getElementById("groupName").value,
        "devices": devices,
        "slideshows": slideshows
    });
}
async function saveSlideData() {
    let id = document.getElementById("slideshowSlideID").innerHTML
    let time = 0;
    if (!document.getElementById("slideExpireCheckbox").checked) {
        time = new Date(document.getElementById("slideExpireDate").value + " " + document.getElementById("slideExpireTime").value)
    }
    await postWithResult("saveSlideStatus", "/api/slide/edit", {
        "id": id,
        "volume": document.getElementById("slideAudioSlider").value,
        "name": document.getElementById("slideshowSlideName").value,
        "screentime": document.getElementById("slideshowSlideDisplayTime").value,
        "member": document.getElementById("slideshowID").innerHTML,
        "expire": time
    });

    if (slideCache[id].position+1 != document.getElementById("slideshowSlidePosition").value) {
        await postWithResult("saveSlideStatus", "/api/slide/move", {
            "originalPos": slideCache[id].position,
            "newPos": document.getElementById("slideshowSlidePosition").value-1,
            "slideshow": current
        });
        processSlideshowChange(false)
    } else {
        slideRestartCache.slides[id].name = document.getElementById("slideshowSlideName").value
        slideRestartCache.slides[id].screentime = document.getElementById("slideshowSlideDisplayTime").value
        slideRestartCache.slides[id].volume = document.getElementById("slideAudioSlider").value
        slideRestartCache.slides[id].expire = time
        processSlideshowChange(true)
    }
}

async function isReady() {
    devicedom.addEventListener("change", async () => processDeviceChange());
    slideshowdom.addEventListener("change", async () => processSlideshowChange(false));
    groupdom.addEventListener("change", async () => processGroupChange());
    document.getElementById("saveDeviceButton").addEventListener("click", async => {saveDeviceData()});
    document.getElementById("saveSlideshowButton").addEventListener("click", async => {saveSlideshowData()});
    document.getElementById("saveSlideButton").addEventListener("click", async => {saveSlideData()});
    document.getElementById("addDeviceButton").addEventListener("click", async => {addDevice()});
    document.getElementById("addSlideshowButton").addEventListener("click", async => {addSlideshow()});
    document.getElementById("deleteDeviceButton").addEventListener("click", async => {deleteDevice()});
    document.getElementById("deleteSlideshowButton").addEventListener("click", async => {deleteSlideshow()});
    document.getElementById("deleteSlideButton").addEventListener("click", async => {deleteSlide()});
    document.getElementById("addGroupButton").addEventListener("click", async => {addGroup()});
    document.getElementById("deleteGroupButton").addEventListener("click", async => {deleteGroup()});
    document.getElementById("saveGroupButton").addEventListener("click", async => {saveGroupData()});
    document.getElementById("refreshDevice").addEventListener("click", async => {refreshDevice()});
    document.getElementById("rebootDevice").addEventListener("click", async => {rebootDevice()});
    document.getElementById("slideAudioSlider").addEventListener("change", () => {document.getElementById("slideAudioValue").innerHTML = `${document.getElementById("slideAudioSlider").value}%`})
    await init_navigation(); 
    setState(0);
}
