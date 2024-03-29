const fetchData = async (country_id = "BR") => {

    loading(true, "Carregando")
    try {
        const responsesJSON = await Promise.all([
            fetch('https://iptv-org.github.io/api/regions.json'),
            fetch('https://iptv-org.github.io/api/channels.json'),
            fetch('https://iptv-org.github.io/api/countries.json'),
            fetch('https://iptv-org.github.io/api/categories.json')
        ]);
        const [regions, channels, countries, categories] = await Promise.all(responsesJSON.map(r => r.json()))

        fetch(`https://iptv-org.github.io/iptv/countries/${country_id.toLowerCase()}.m3u`).then(response => response.text()).then(
            streams_raw => {
                let streams = []
                let streams_raw_channels = streams_raw.replace(/\n/g, ',').split("#EXTINF:-1 ")

                streams_raw_channels.forEach(stream => {
                    const regex = /tvg-id="(?<id>.+?)".+,(?<url>.+?),/g
                    const match = regex.exec(stream)

                    if (match) {
                        const id = match.groups.id
                        const url = match.groups.url
                        streams.push({
                            "id": id,
                            "url": url
                        })
                    }
                })

                init(regions, countries, categories, channels, streams)
            })
    } catch (err) {
        throw err;
    }
}

let video_player = videojs('my-video', {
    controls: true,
    autoplay: false,
    log: false,
    sources: []
})

let raw_canais = []
let canais_categoria = []
let pais_selecionado_id = 'BR'
pais_selecionado_id = localStorage.getItem("selected_country")

if (pais_selecionado_id === null) {
    pais_selecionado_id = "BR"
    localStorage.setItem("selected_country", pais_selecionado_id)
}

function init(regions, countries, categories, channels, streams) {
    carregarRegioes()
    carregarPaises(regions, countries)
    raw_canais = filtrarCanais(channels, streams)
    carregarCategorias(categories)
    
    loading(false)
}

fetchData(pais_selecionado_id).then()

function carregarRegioes() {
    let regions = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']

    let lista_regions = document.getElementById("tab-regions")
    let conteudo_regions = document.getElementById("tabContent-regions")

    lista_regions.innerHTML = ""
    conteudo_regions.innerHTML = ""

    regions.forEach((region, i) => {
        let lista_regions_html = `
            <li class="nav-item" role="presentation">
                <button class="nav-link rounded-5 ${i === 0 ? "active" : ""}" id="tab-${region}" data-bs-toggle="pill"
                    data-bs-target="#${region}" type="button" role="tab" aria-controls="${region}"
                    aria-selected="true">
                    ${region.toUpperCase()}
                </button>
            </li>
        `
        lista_regions.innerHTML += lista_regions_html
    })

    regions.forEach((region, i) => {
        let lista_conteudo_categorias_html = `
            <div class="tab-pane fade ${i === 0 ? "show active" : ""}" id="${region}" role="tabpanel"
                aria-labelledby="${region}-tab" tabindex="${i}">
                <div class="row row-fluid" id="lista-paises-${region}"></div>
            </div>`

        conteudo_regions.innerHTML += lista_conteudo_categorias_html
    })
}

function carregarPaises(regions, countries) {
    regions.forEach(region => {
        if (['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'].includes(region["name"])) {
            countries.forEach(country => {
                let conteudo_country = document.getElementById(`lista-paises-${region["name"]}`)
                if (region["countries"].includes(country["code"])) {
                    conteudo_country.innerHTML += `
                    <div class="col-6 col-md-4 col-lg-2 p-1 p-md-2">
                    <div class="btn btn-light p-3 text-start w-100 h-100" onclick="mudarPais('${country["code"]}')">
                    <h4 class="my-auto me-2">${country["flag"]}</h4>
                    <p class="my-auto">${country["name"]}</hp>
                    </div>
                    </div>
                    `
                }

                if (country["code"] === pais_selecionado_id)
                    document.getElementById("pais_nome").innerHTML = `
                    ${country["flag"]}
                    `
                //${country["name"].toUpperCase()}
            })
        }
    })
}

function carregarCategorias(categories) {
    let lista_categorias = document.getElementById("tab-categorias")
    let conteudo_categorias = document.getElementById("tabContent-categorias")

    lista_categorias.innerHTML = ""
    conteudo_categorias.innerHTML = ""
    
    let categorias = []
    raw_canais.forEach(channel => {
        if (!categorias.includes(channel["categories"][0])){
            categorias.push(channel["categories"][0])
        }
    })
    
    categorias.sort()

    categorias.forEach((category, i) => {
        let lista_categorias_html = `
            <li class="nav-item" role="presentation">
                <button class="nav-link rounded-5 ${i === 0 ? "active" : ""}" id="tab-${category}" data-bs-toggle="pill"
                    data-bs-target="#${category}" type="button" role="tab" aria-controls="${category}"
                    aria-selected="true" onClick=testarCanaisCategoria("${category}")>
                    ${category.toUpperCase()}
                </button>
            </li>
        `
        lista_categorias.innerHTML += lista_categorias_html
    })

    categorias.forEach((category, i) => {
        let lista_conteudo_categorias_html = `
            <div class="tab-pane fade ${i === 0 ? "show active" : ""}" id="${category}" role="tabpanel"
                aria-labelledby="${category}-tab" tabindex="${i}">
                <div class="row row-fluid" id="lista-canais-${category}"></div>
            </div>`

        conteudo_categorias.innerHTML += lista_conteudo_categorias_html
    })
}

function carregarCanais(channels) {
    
    channels.forEach(channel => {
        let conteudo_categorias = document.getElementById(`lista-canais-${channel["categories"][0]}`)

        conteudo_categorias.innerHTML += `
            <div class="col-12 col-md-4 col-lg-2 p-2">
                <div class="btn btn-light px-3 py-4 text-start d-flex h-100" onclick="mudarCanal('${channel["id"]}')">
                    <div class="col-3 my-auto py-auto">
                        <img src="${channel["logo"]}" class="img img-fluid" alt="${channel["name"]}"/>
                    </div>
                    <p class="ms-3 my-auto col">${channel["name"]}</hp>
                </div>
            </div>
        `
    })
}

function filtrarCanais(channels, streams) {
    let filtered_channels = []
    channels.forEach(channel => {
        if (channel["country"] === pais_selecionado_id && channel["closed"] == null) {
            streams.forEach(stream => {
                if (stream["id"] === channel["id"]) {
                    filtered_channels.push({
                        "id": channel["id"],
                        "name": channel["name"],
                        "logo": channel["logo"],
                        "country": channel["country"],
                        "categories": channel["categories"].length === 0 ? ["general"] : channel["categories"],
                        "url": stream["url"]
                    })
                }
            })
        }
    })
    return filtered_channels
}

function loading(is_loading, titulo = "CARREGANDO INFORMAÇÕES", info = "") {
    let loading = document.getElementById("loading")
    document.getElementById("titulo_loading").innerText = titulo
    document.getElementById("info_loading").innerText = info

    loading.style.visibility = is_loading ? "visible" : loading.style.visibility = "hidden"
}

async function testarCanais(canais){
    let canais_funcionando = []
    let canais_salvos = {}
    let index = 1

    if(localStorage.getItem('working_channels'))
        canais_salvos = JSON.parse(localStorage.getItem('working_channels'))
    
    if(canais_salvos === null || canais_salvos[pais_selecionado_id] === undefined)
        canais_salvos[pais_selecionado_id] = []

    loading(true, "Testando canais", ``)
    
    for (const channel of canais) {
        if(!canais_salvos[pais_selecionado_id].includes(channel["id"])){
            await verificarVideoSource(channel["url"]).then(is_working => {
                canais_funcionando.push(channel["id"])
                
            }).catch(error => {
                
            })
        }
        
        loading(
            true,
            `Testando canais (${channel["categories"]})`,
            `(${index}/${canais.length}) Canal: ${channel["name"]}`
        )
        
        index += 1
    }
    video_player.reset()
    video_player.pause()
    
    canais_funcionando.forEach(canal => {
        if(!canais_salvos[pais_selecionado_id].includes(canal))
            canais_salvos[pais_selecionado_id].push(canal)
    })

    localStorage.setItem('working_channels', JSON.stringify(canais_salvos))
    
    loading(false)
    
    return canais_salvos[pais_selecionado_id]
}

function testarCanaisCategoria(categoria) {
    let lista_canais_categoria = []
    
    raw_canais.forEach(channel => {
        if (channel["categories"].includes(categoria))
            lista_canais_categoria.push(channel)
    })

    testarCanais(lista_canais_categoria).then(canais_funcionando => {
        let lista_canais = []
        
        lista_canais_categoria.forEach(canal => {
            if(canais_funcionando.includes(canal["id"])){
                lista_canais.push(canal)
                document.getElementById(`lista-canais-${canal["categories"][0]}`).innerHTML = ''
            }
        })

        carregarCanais(lista_canais)
        canais_categoria = lista_canais
    })
}

function mudarPais(country_id) {
    pais_selecionado_id = country_id
    localStorage.setItem("selected_country", pais_selecionado_id)
    fetchData(country_id).then()
}

function mudarCanal(channel_id) {
    let player = document.getElementById("my-video")
    let channel_name = document.getElementById("canal_nome")
    let channel_category = document.getElementById("canal_categoria")
    let channel_capa = document.getElementById("canal_capa")
    let new_channel = {}

    canais_categoria.forEach(channel => {
        if (channel["id"] === channel_id) {
            channel_name.innerText = channel["name"]
            channel_category.innerText = `Categoria: ${channel["categories"]}`
            channel_capa.src = channel["logo"]

            video_player.src({src: channel["url"], type: 'application/x-mpegURL'})
            video_player.poster(channel["logo"])

            //video_player.on('error', player_error_listener(channel))
            video_player.load()
            video_player.play()

            window.scrollTo({top: 0, behavior: 'smooth'})
        }
    })
}

function verificarVideoSource(url) {
    return new Promise((resolve, reject) => {
        let loadTimeout = setTimeout(() => {
            video_player.off('loadedmetadata', loadedMetadataHandler)
            video_player.off('error', errorHandler)

            video_player.pause()
            reject(true)
        }, 20000)

        const loadedMetadataHandler = () => {
            clearTimeout(loadTimeout)
            video_player.off('loadedmetadata', loadedMetadataHandler)
            video_player.off('error', errorHandler)

            video_player.pause()
            resolve(true)
        }

        const errorHandler = () => {
            clearTimeout(loadTimeout)
            video_player.off('loadedmetadata', loadedMetadataHandler)
            video_player.off('error', errorHandler)
            
            video_player.pause()
            reject(true)
        }

        video_player.on('error', errorHandler)
        video_player.on('loadedmetadata', loadedMetadataHandler)

        video_player.src(url)
        video_player.load()
        video_player.play()
    })
}