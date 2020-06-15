let slideshowdom = document.getElementById("slideshows");
let devicedom = document.getElementById("devices");
let dropArea = document.getElementById("dropBox");
let state, current, currentSlideshow, currentDevice, slideCache, deviceCache, slideshowCache, slideRestartCache
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
        document.getElementById("slideshowConfiguration").style.display = "none"
        document.getElementById("placeholder").style.display = "none"
        document.getElementById("deviceConfigurationNav").style.display = "block"
        document.getElementById("slideshowConfigurationNav").style.display = "none"
        document.getElementById("placeholderNav").style.display = "none"
    }
    if (type == 2) {
        document.getElementById("slideshowConfiguration").style.display = "block"
        document.getElementById("deviceConfiguration").style.display = "none"
        document.getElementById("placeholder").style.display = "none"
        document.getElementById("slideshowConfigurationNav").style.display = "block"
        document.getElementById("deviceConfigurationNav").style.display = "none"
        document.getElementById("placeholderNav").style.display = "none"
    }
    if (type == 0) {
        document.getElementById("placeholder").style.display = "block"
        document.getElementById("slideshowConfiguration").style.display = "none"
        document.getElementById("deviceConfiguration").style.display = "none"
        document.getElementById("placeholderNav").style.display = "block"
        document.getElementById("slideshowConfigurationNav").style.display = "none"
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

async function addSlideshow() {
    let res = await postWithResult("addSlideshowStatus", "/api/slideshow/new", {});
    if (res) {
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

async function deleteSlide() {
    let slide = document.getElementById("slideshowSlideID").innerHTML
    if (confirm("Are you sure you want to delete slide " + slide + "? This is irreversable!")) {
        res = await postWithResult("addSlideshowStatus", "/api/slide/delete", {"id": slide});
        if (res) {
            delete slideRestartCache.slides[slideRestartCache.slides.findIndex(p => p.id == slide)]
            slideRestartCache.slides = slideRestartCache.slides.filter((el) => el != null);
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
    
    function makethumb(data) {
        return new Promise((resolve) => {
            var i = new Image(); 
            i.onload = function(){
                let size = i.width/200
                resolve(resizedataURL(data, i.width/size, i.height/size));
            };
            i.src = data; 
        });
    }
    if (internalDrag == false) {
        let dt = e.dataTransfer
        let files = dt.files
        for (file_number in files) {
            let file = files[file_number]
            if (file.type != null) { 
                if (file.type.startsWith("image")) {
                    let b64 = await toBase64(file)
                    await post("/api/slide/new", {
                        "member": current,
                        "name": file.name,
                        "data": b64,
                        "thumbnail": await makethumb(b64)
                    })
                    document.getElementById("addSlideStatus").innerHTML =  `${file_number}/${files.length} Uploaded`
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
    //slideRestartCache.slides.splice(origin, 0, slideRestartCache.slides.splice(final, 1)[0]);
    processSlideshowChange(false)
}

async function init_navigation() {
    let devices = await get("/api/devices");
    let slideshows = await get("/api/slideshows");
    
    devicedom.innerHTML = ""
    slideshowdom.innerHTML = ""
    slideshowCache = {}
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
    let id = img.target.id.replace("g_fislideshowID_", "");
    document.getElementById("slideshowSlideID").innerHTML = id
    document.getElementById("slideshowSlideName").value = slideCache[id].name
    document.getElementById("slideshowSlideDisplayTime").value = slideCache[id].screentime
    document.getElementById("slideshowSlideName").disabled = false
    document.getElementById("slideshowSlideDisplayTime").disabled = false
    document.getElementById("saveSlideButton").disabled = false
    document.getElementById("deleteSlideButton").disabled = false
}

async function processDeviceChange() {
    deselectRadio(slideshowdom)
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
    document.getElementById("devicesSlideshowList").innerHTML = ""
    for (slideshow in slideshowCache) {
        let container = document.createElement("div")
        let option = document.createElement("input");
        option.type = "checkbox"
        option.className = "g_select"
        option.id = "gid_" + slideshow
        if (data.slideshows.includes(slideshow)) {
            option.checked = 1
        }
        let optionLabel = document.createElement("label");
        optionLabel.htmlFor = "gid_" + slideshow
        optionLabel.appendChild(document.createTextNode(slideshowCache[slideshow]));
        container.appendChild(option);
        container.appendChild(optionLabel);
        document.getElementById("deviceSlideshowList").appendChild(container);
    }
    setState(1)
}

async function processSlideshowChange(useCache) {
        deselectRadio(devicedom);
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
        for (slide in slides) {
            slideCache[slides[slide].id] = slides[slide]
            let figure = document.createElement("figure");
            let img = document.createElement("img");
            let capt = document.createElement("figcaption");
            figure.className = "g_fig"
            figure.id = "g_fislideshowID_" + slides[slide].id
            figure._id = i
            img.id = slides[slide].id
            capt.id = slides[slide].id
            img.setAttribute("loading", "lazy")
            img.setAttribute("src", `/api/slide/thumbnail/${slides[slide].id}`);
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
        document.getElementById("slideshowName").value = data.info.name
        if (data.info.expire == "0") {
            document.getElementById("slideshowExpireDate").disabled = true
            document.getElementById("slideshowExpireTime").disabled = true
            document.getElementById("slideshowExpireCheckbox").checked = true
        } else {
            let expire = new Date(data.info.expire)
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
async function saveSlideData() {
    await postWithResult("saveSlideStatus", "/api/slide/edit", {
        "id": document.getElementById("slideshowSlideID").innerHTML,
        "name": document.getElementById("slideshowSlideName").value,
        "screentime": document.getElementById("slideshowSlideDisplayTime").value
    });
    slideRestartCache.slides[slideRestartCache.slides.findIndex(p => p.id == document.getElementById("slideshowSlideID").innerHTML)].name = document.getElementById("slideshowSlideName").value
    slideRestartCache.slides[slideRestartCache.slides.findIndex(p => p.id == document.getElementById("slideshowSlideID").innerHTML)].screentime = document.getElementById("slideshowSlideDisplayTime").value

    processSlideshowChange(true)
}

async function isReady() {
    devicedom.addEventListener("change", async () => processDeviceChange());
    slideshowdom.addEventListener("change", async () => processSlideshowChange(false));
    document.getElementById("saveDeviceButton").addEventListener("click", async => {saveDeviceData()});
    document.getElementById("saveSlideshowButton").addEventListener("click", async => {saveSlideshowData()});
    document.getElementById("saveSlideButton").addEventListener("click", async => {saveSlideData()});
    document.getElementById("addDeviceButton").addEventListener("click", async => {addDevice()});
    document.getElementById("addSlideshowButton").addEventListener("click", async => {addSlideshow()});
    document.getElementById("deleteDeviceButton").addEventListener("click", async => {deleteDevice()});
    document.getElementById("deleteSlideshowButton").addEventListener("click", async => {deleteSlideshow()});
    document.getElementById("deleteSlideButton").addEventListener("click", async => {deleteSlide()});
    await init_navigation(); 
    setState(0);
}