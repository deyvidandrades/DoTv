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

    loadCountries(regions, countries)
    loadChannels(channels, categories, streams).then(r => {
        if (channel_list.length > 0)
            loadRecomended()
        loading(false)
    })
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
            })

            lista_paises.innerHTML += `${lista_paises_html}</div></div>`
        }
    })

    selected_country = localStorage.getItem("selected_country")
    if (selected_country === null)
        changeCountry("BR")
}

async function loadChannels(channels, categories, streams) {
    let filtered_channels = []

    channels.forEach((channel) => {
        if (channel["country"] === selected_country && channel["closed"] == null)
            streams.forEach(stream => {
                if (stream["id"] === channel["id"])
                    filtered_channels.push({
                        "id": channel["id"],
                        "name": channel["name"],
                        "logo": channel["logo"],
                        "country": channel["country"],
                        "categories": channel["categories"],
                        "url": stream["url"]
                    })

            })
    })

    let saved_channels = JSON.parse(localStorage.getItem('working_channels'))

    if (saved_channels != null && saved_channels[selected_country] === undefined) {
        loading(true, "Testando canais")
        let working_channels = []
        let index = 0
        for (const channel of filtered_channels) {
            await checkVideoSource(channel["url"]).then(is_working => {
                loading(
                    true,
                    "Testando canais",
                    `(${index}/${filtered_channels.length}) Canal adicionado: ${channel["name"]}`
                )

                working_channels.push(channel)
            }).catch(error => {

            })

            index += 1
        }
        loading(false)

        saved_channels[selected_country] = working_channels

        localStorage.setItem('working_channels', JSON.stringify(saved_channels))

        //console.log(working_channels)
        exibir_lista_canais(categories, working_channels)
    } else {
        exibir_lista_canais(categories, saved_channels[selected_country])
    }
}

function exibir_lista_canais(categories, filtered_channels) {
    let lista_categorias = document.getElementById("lista_categorias")
    lista_categorias.innerHTML = ""

    channel_list = filtered_channels
    let lista_outros = []
    let canais_listados = []
    categories.forEach((category) => {
        let lista_categorias_html = `<div class="mt-5"><p class="lead">${category["name"]}</p><div class="row row-fluid">`
        let has_channel = false
        filtered_channels.forEach((channel) => {

            if (channel["categories"].includes(category["id"]) && !canais_listados.includes(channel["id"])) {
                lista_categorias_html += `
                    <div class="col-12 col-md-4 col-lg-2 p-2">
                        <div class="btn btn-light px-3 py-4 text-start d-flex h-100" onclick="changeChannel('${channel["id"]}')">
                            <div class="col-3 my-auto py-auto">
                                <img src="${channel["logo"]}" class="img img-fluid" alt="${channel["name"]}"/>
                            </div>
                            <p class="ms-3 my-auto col">${channel["name"]}</hp>
                        </div>
                    </div>
                    `
                has_channel = true
                canais_listados.push(channel["id"])
            }

            if (channel["categories"].length === 0 && !lista_outros.includes(channel) && !canais_listados.includes(channel["id"])) {
                lista_outros.push(channel)
            }
        })


        if (has_channel)
            lista_categorias.innerHTML += `${lista_categorias_html}</div></div>`

    })

    if (lista_outros.length > 0) {
        let lista_categorias_html = `<div class="mt-5"><p class="lead">Outros</p><div class="row row-fluid">`
        lista_outros.forEach(channel => {
            lista_categorias_html += `
                    <div class="col-12 col-md-4 col-lg-2 p-2">
                        <div class="btn btn-light p-1 text-start d-flex h-100" onclick="changeChannel('${channel["id"]}')">
                            <div class="col-3 m-3">
                                <img src="${channel["logo"]}" class="img img-fluid" alt="${channel["name"]}"/>
                            </div>
                            <p class="my-auto col">${channel["name"]}</hp>
                        </div>
                    </div>
                    `
        })
        lista_categorias.innerHTML += `${lista_categorias_html}</div></div>`
    }
}

function loadRecomended() {
    let lista_recomendacoes = document.getElementById("lista_recomendacoes")
    lista_recomendacoes.innerHTML = ""

    let lista_recomendacoes_html = `<div class="mt-5"><p class="lead">Recomendados</p><div class="row row-fluid">`
    for (let i = 0; i < 12; i++) {
        let index = Math.floor(Math.random() * (channel_list.length - 1))
        let channel = channel_list[index]

        lista_recomendacoes_html += `
                    <div class="col-12 col-md-4 col-lg-2 p-2">
                        <div class="btn btn-light px-3 py-4 text-start d-flex h-100" onclick="changeChannel('${channel["id"]}')">
                            <div class="col-3 my-auto py-auto">
                                <img src="${channel["logo"]}" class="img img-fluid" alt="${channel["name"]}"/>
                            </div>
                            <p class="ms-3 my-auto col">${channel["name"]}</hp>
                        </div>
                    </div>
                    `
    }
    lista_recomendacoes.innerHTML += `${lista_recomendacoes_html}</div></div>`
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

function player_error_listener(channel) {

}

function loadChannel(channel) {
    video_player.src({src: channel["url"], type: 'application/x-mpegURL'})
    video_player.poster(channel["logo"])

    //video_player.on('error', player_error_listener(channel))
    video_player.load()
    video_player.play()
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