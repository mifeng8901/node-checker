const axios = require('axios')
const yaml = require('js-yaml')
const { exec, execSync, spawn, spawnSync } = require('child_process')
const { HttpsProxyAgent } = require('https-proxy-agent')
const { writeFileSync, readFileSync } = require('fs')
const agent = new HttpsProxyAgent('http://127.0.0.1:7890')
agent.options.rejectUnauthorized = false

const http = axios.create({

})

const clashApi = axios.create({
    baseURL: 'http://localhost:9090',
})

async function refresh() {
    await clashApi.put('/configs?force=true', { "path": __dirname + "/config.yaml" })
}
async function useGlobal() {
    await clashApi.patch('/configs', { "mode": "Global" })
}
async function changeNode(name) {
    await clashApi.put('/proxies/GLOBAL', { name })
}


async function getNodes(url) {
    const { data } = await http.get(url, {
        headers: {
            "User-Agent": 'NekoBox/Android/1.3.3 (Prefer ClashMeta Format)'
        }
    })

    const config = yaml.load(data)
    config.mode = 'Global'
    config.port = 7890
    config['external-controller'] = '127.0.0.1:9090'
    writeFileSync('config.yaml', yaml.dump(config), 'utf-8')
}

async function getIpInfo() {
    const { data } = await http.get('http://ip-api.com/json?lang=zh-CN')
    console.log(data);
    return data

}

async function run(subUrl) {
    await getNodes(subUrl)
    const config = readFileSync('config.yaml', 'utf-8')
    const { proxies } = yaml.load(config)
    exec('./mi -d .')

    await new Promise(r => setTimeout(r, 2000))

    const { data } = await clashApi.get('/')
    console.log(data);

    await refresh()


    http.defaults.httpAgent = agent
    http.defaults.httpsAgent = agent
    http.defaults.headers["User-Agent"] = 'curl/7.68.0'

    await useGlobal()
    const newConfig = {
        proxies: []
    }
    const names = {}
    for (let proxy of proxies) {
        try {

            console.log(proxy.name);
            await changeNode(proxy.name)
            const { countryCode, country, city, isp } = await getIpInfo()

            let name = `${countryCode}-${country}-${city}-${isp}`
            if (names[name]) {
                names[name]++
            }
            else {
                names[name] = 1
            }
            name = `${name}-${names[name]}`
            newConfig.proxies.push({ ...proxy, name })

        } catch (error) {
            console.log(error)
        }
    }
    console.log(newConfig);

    newConfig.proxies.sort((a, b) => {
        return a.name.localeCompare(b.name)
    })


    writeFileSync(Date.now() + '.yaml', yaml.dump(newConfig), 'utf-8')
    process.exit(0)
}

run(`https://proxypool.link/clash/proxies`)