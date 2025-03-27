const axios = require('axios')
const yaml = require('js-yaml')
const express = require('express')
const { HttpsProxyAgent } = require('https-proxy-agent')
const { writeFileSync, readFileSync } = require('fs')
const { exec, spawn } = require('child_process')


const { upload } = require('./utils/github-api')

const clash = exec('./mi -d .')
clash.on('error', (error) => {
    console.log(`error: ${error.message}`);
});
clash.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

clash.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
}
);



const app = express()

app.use(express.json())

const agent = new HttpsProxyAgent('http://127.0.0.1:7890')
agent.options.rejectUnauthorized = false

const http = axios.create({

})

const clashApi = axios.create({
    baseURL: 'http://127.0.0.1:9090',
})

async function refresh() {
    await clashApi.put('/configs', { "path": __dirname + "/config.yaml" })
}
async function useGlobal() {
    await clashApi.patch('/configs', { "mode": "Global" })
}
async function changeNode(name) {
    await clashApi.put('/proxies/GLOBAL', { name })
}


async function getNodes(url) {
    const { data } = await axios.get(url, {
        headers: {
            "User-Agent": 'NekoBox/Android/1.3.3 (Prefer ClashMeta Format)'
        }
    })

    const config = yaml.load(data)
    const newConfig = {}
    const proxiesMap = new Map()
    for (let proxy of config.proxies) {
        const { type, id, server, port, password, uuid } = proxy
        const name = `${type}-${id}-${server}-${port}-${password}-${uuid}`
        proxy.name = name
        proxiesMap.set(name, proxy)
    }
    newConfig.mode = 'Global'
    newConfig.port = 7890
    newConfig['external-controller'] = '0.0.0.0:9090'
    newConfig.proxies = Array.from(proxiesMap.values())
    writeFileSync('config.yaml', yaml.dump(newConfig), 'utf-8')
}

async function getIpInfo() {
    const { data } = await http.get('http://ip-api.com/json?lang=zh-CN')
    console.log(data);
    return data

}

async function run(subUrl) {
    try {

        await getNodes(subUrl)
        const config = readFileSync('config.yaml', 'utf-8')
        const { proxies } = yaml.load(config)
        await new Promise(r => setTimeout(r, 2000))

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


        // writeFileSync(Date.now() + '.yaml', yaml.dump(newConfig), 'utf-8')

        upload(yaml.dump(newConfig))
    } catch (error) {
        console.log(error);

    }
    isRunning = false
}

// run(`https://proxypool.link/clash/proxies`)
// run(`https://clashe.eu.org/clash/proxies`)
// run(`https://pp.dcd.one/clash/proxies`)

let isRunning = false
app.get('/', (req, res) => {
    res.send('Hello World')
})
app.get('/status', (req, res) => {
    res.send(isRunning ? 'running' : 'idle')
})

app.post('/check-sub', (req, res) => {
    if (isRunning) {
        res.send('running')
        return
    }
    isRunning = true
    const { url } = req.body
    run(url)
    res.send('ok')
})


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000')
})