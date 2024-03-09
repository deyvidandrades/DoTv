const fetchData = async (country_id = "BR") => {

    loading(true, "Carregando canais.")
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


let selected_country = 'BR'
let channel_list = []
let video_player = videojs('my-video', {
    controls: true,
    autoplay: false,
    log: false,
    sources: []
});

fetchData().then(r => {
})

function loading(is_loading, titulo = "CARREGANDO INFORMAÇÕES", info = "") {
    let loading = document.getElementById("loading")
    document.getElementById("titulo_loading").innerText = titulo
    document.getElementById("info_loading").innerText = info

    loading.style.visibility = is_loading ? "visible" : loading.style.visibility = "hidden"
}

function init(regions, countries, categories, channels, streams) {
    selected_country = localStorage.getItem("selected_country")

    if (selected_country === null) {
        selected_country = "BR"
        localStorage.setItem("selected_country", selected_country)
    }

    loadCountries(regions, countries)
    loadChannels2(channels, streams)

}

function loadCountries(regions, countries) {
    let lista_paises = document.getElementById("lista_paises")

    lista_paises.innerHTML = ""
    regions.forEach((region) => {

        if (['Africa', 'Asia', 'Americas', 'Europe', 'Oceania'].includes(region["name"])) {
            let lista_paises_html = `<div class="mt-5"><p class="lead">${region["name"]}</p><div class="row row-fluid">`

            countries.forEach((country) => {
                if (region["countries"].includes(country["code"])) {
                    lista_paises_html += `
                    <div class="col-6 col-md-4 col-lg-2 p-1 p-md-2">
                    <div class="btn btn-light p-3 text-start w-100 h-100" onclick="changeCountry('${country["code"]}')">
                    <h4 class="my-auto me-2">${country["flag"]}</h4>
                    <p class="my-auto">${country["name"]}</hp>
                    </div>
                    </div>
                    `
                }

                if (country["code"] === selected_country)
                    document.getElementById("pais_nome").innerText = `
                    ${country["flag"]} ${country["name"]}
                    `
            })

            lista_paises.innerHTML += `${lista_paises_html}</div></div>`
        }
    })
}

function loadChannels2(channels, streams) {
    let filtered_channels = []
    channels.forEach(channel => {
        if (channel["country"] === selected_country && channel["closed"] == null) {
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

    testChannels2(filtered_channels).then(working_channels => {
        let lista_categorias = []

        working_channels.forEach(channel => {
            if (!lista_categorias.includes(channel["categories"][0]))
                lista_categorias.push(channel["categories"][0])
        })

        loadCategories(lista_categorias)
        exibir_lista_canais2(working_channels)
        channel_list = working_channels
        loading(false)
    })
}

async function testChannels2(channels) {
    let saved_channels = JSON.parse(localStorage.getItem('working_channels'))
    let working_channels = []
    let index = 0

    if (saved_channels == null || saved_channels[selected_country] === undefined) {
        for (const channel of channels) {
            await checkVideoSource(channel["url"]).then(is_working => {
                loading(
                    true,
                    "Testando canais",
                    `(${index}/${channels.length}) Canal adicionado: ${channel["name"]}`
                )

                working_channels.push(channel["id"])
            }).catch(error => {

            })

            index += 1
        }

        saved_channels[selected_country] = working_channels

        localStorage.setItem('working_channels', JSON.stringify(saved_channels))
        return saved_channels[selected_country]
    } else {
        let new_list = []
        channels.forEach(channel => {
            if (saved_channels[selected_country].includes(channel["id"]))
                new_list.push(channel)
        })

        return new_list
    }
}

function loadCategories(categories) {
    categories.sort()

    let lista_categorias = document.getElementById("tab-categorias")
    let conteudo_categorias = document.getElementById("tabContent-categorias")

    lista_categorias.innerHTML = ""
    conteudo_categorias.innerHTML = ""

    categories.forEach((category, i) => {
        let lista_categorias_html = `
            <li class="nav-item" role="presentation">
                <button class="nav-link rounded-5 ${i === 0 ? "active" : ""}" id="tab-${category}" data-bs-toggle="pill"
                    data-bs-target="#${category}" type="button" role="tab" aria-controls="${category}"
                    aria-selected="true">
                    ${category.toUpperCase()}
                </button>
            </li>
        `
        lista_categorias.innerHTML += lista_categorias_html
    })

    categories.forEach((category, i) => {
        let lista_conteudo_categorias_html = `
            <div class="tab-pane fade ${i === 0 ? "show active" : ""}" id="${category}" role="tabpanel"
                aria-labelledby="${category}-tab" tabindex="${i}">
                <div class="row row-fluid" id="lista-canais-${category}"></div>
            </div>`

        conteudo_categorias.innerHTML += lista_conteudo_categorias_html
    })
}

function exibir_lista_canais2(channels) {
    channels.forEach(channel => {
        let conteudo_categorias = document.getElementById(`lista-canais-${channel["categories"][0]}`)

        conteudo_categorias.innerHTML += `
            <div class="col-12 col-md-4 col-lg-2 p-2">
                <div class="btn btn-light px-3 py-4 text-start d-flex h-100" onclick="changeChannel('${channel["id"]}')">
                    <div class="col-3 my-auto py-auto">
                        <img src="${channel["logo"]}" class="img img-fluid" alt="${channel["name"]}"/>
                    </div>
                    <p class="ms-3 my-auto col">${channel["name"]}</hp>
                </div>
            </div>
        `
    })
}

function changeCountry(country_id) {
    selected_country = country_id
    localStorage.setItem("selected_country", selected_country)
    fetchData(country_id).then(r => {
    })
}

function changeChannel(channel_id) {
    let player = document.getElementById("my-video")
    let channel_name = document.getElementById("canal_nome")
    let channel_category = document.getElementById("canal_categoria")
    let channel_capa = document.getElementById("canal_capa")
    let new_channel = {}

    channel_list.forEach(channel => {
        if (channel["id"] === channel_id) {
            channel_name.innerText = channel["name"]
            channel_category.innerText = `Categoria: ${channel["categories"]}`
            channel_capa.src = channel["logo"]

            loadChannel(channel)
        }
    })
}

function loadChannel(channel) {
    video_player.src({src: channel["url"], type: 'application/x-mpegURL'})
    video_player.poster(channel["logo"])

    //video_player.on('error', player_error_listener(channel))
    video_player.load()
    video_player.play()

    window.scrollTo({top: 0, behavior: 'smooth'})
}

function checkVideoSource(url) {
    return new Promise((resolve, reject) => {
        let loadTimeout = setTimeout(() => {
            video_player.off('loadedmetadata', loadedMetadataHandler);
            video_player.off('error', errorHandler);
            reject(false);
        }, 10000)

        const loadedMetadataHandler = () => {
            clearTimeout(loadTimeout)
            video_player.off('loadedmetadata', loadedMetadataHandler)
            video_player.off('error', errorHandler)
            resolve(true)
        }

        const errorHandler = () => {
            clearTimeout(loadTimeout)
            video_player.off('loadedmetadata', loadedMetadataHandler)
            video_player.off('error', errorHandler)

            reject(false)
        }

        video_player.on('error', errorHandler)
        video_player.on('loadedmetadata', loadedMetadataHandler)

        video_player.src(url)
        video_player.load()
        video_player.play()
    })
}