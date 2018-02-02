const TB = require('node-telegram-bot-api')
const cheerio = require('cheerio')
const mongoose = require('mongoose')
const request = require('request')
const underscore = require('underscore')
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const S = require('string')
const state = {}
const videocards = {}
///////////////////////////////
const config = require('./config')
const kb = require('./kb-keys')
const keyboards = require('./keyboards')
const helpers = require('./helpers')
const mailer = require('./mail')
//////////////////////////////
require('./card-model')
mongoose.Promise = global.Promise
mongoose.connect(config.DB_URL, {
}).then(() => {
    console.log('connected')
}).catch(e => {
    console.log(e)
})
const Card = mongoose.model('card1')
/////////////////////////////
let app = express()
app.set("view engine", "ejs")
app.use('/src', express.static(path.join(__dirname, '/src')))
//////////////////////////////
const bot = new TB(config.TOKEN, {
    polling: true
})
helpers.start()
/////////////////////////////
bot.onText(/\/start/, msg => {
    const text = `Здравствуйте, <b>${msg.from.first_name}</b>\nВыберите команду для начала работы`
    sendHTML(helpers.chatId(msg), text)
})

bot.onText(/\/help/, msg => {
    const text = `<b>${msg.from.first_name}</b>, отправьте модель видеокарты и дождитесь списка моделей, затем Вы можете заказать видеокарту, введя контактную информацию`
    sendHTML(helpers.chatId(msg), text)
})

bot.on('message', msg => {
    const chatId = helpers.chatId(msg)
    const text = msg.text.trim()
    console.log('msg')
    console.log(state)
    if (msg.text == kb.back) {
        if (state[chatId])
            delete state[chatId]
        bot.sendMessage(chatId, '<b>Действие отменено</b>', {
            reply_markup: {
                remove_keyboard: true
            }, parse_mode: 'HTML'
        })
    }
    else if (state[chatId]) {
        const name = msg.from.first_name
        const username = msg.from.username
        orderCard(chatId, text, name, username)
    }
    else if(msg.text.match(/\/c/))
        sendDetail(chatId, msg.text)
    else
        findCard(chatId, text)
})
bot.on('callback_query', query => {
    const queryID = helpers.queryChatId(query)
    const id = query.data
    state[queryID] = { cardId: id, date: Date.now(), name: '' }
    sendHTML(queryID, 'Отправьте контактную информацию и мы свяжемся с Вами', 'back')
})
/////////////////////////////
function sendHTML(chatId, html, kbName = null) {
    options = {
        parse_mode: 'HTML'
    }
    if (kbName)
        options.reply_markup = {
            keyboard: keyboards[kbName],
            resize_keyboard: true
        }

    bot.sendMessage(chatId, html, options)
}

function findCard(chatId, text) {
    videocards[chatId] = {}
    const arr = text.split(' ')
    Card.find({}).then(cards => {
        console.log(cards)
        const filtered = arr.filter(el => {
            el.trim()
            return el.match(/\w\d/)
        })
        //console.log(filtered)
        let finded = []
        for (card of cards) {
            filtered.forEach(el => {
                if (card.name.indexOf(el) != -1)
                    finded.push(card._id)
            })
        }

        if (finded.length > 0) {
            let anchor = String(Date.now()).substr(-7, 5)
            finded.forEach(fc => {
                //console.log(fc)
                Card.findById(fc).then(el => {
                    //console.log(el)
                    videocards[chatId]['/c'+anchor++] = {
                        caption : `<b>Модель</b>: ${el.name}\n<b>Цена</b>: ${el.price}\n<b>Описание</b>: ${el.urlDesc}`,
                        urlPic : el.urlPic,
                        id: el._id
                    }
                }
            ).then(_=>{
                console.log(videocards[chatId])
                let html = ''
                const keys = Object.keys(videocards[chatId])
                keys.forEach(key=>{
                    console.log(videocards[chatId][key])
                    html += `${key}\n${videocards[chatId][key].caption}\n`
                })
                sendHTML(chatId, `
                Мы нашли для вас следующие варианты:\n${html}\n`)
            }).catch(e => console.log(e))
            })
        }
        else
            parseCard(chatId, arr, text)

    }).catch(e => console.log(e))
}
function sendDetail(chatId, text){
    if(!videocards[chatId])
        return sendHTML(chatId, '<b>Состояние устарело, посторите запрос</b>')
    const el = videocards[chatId][text]
    const caption = S(el.caption).stripTags().s
    bot.sendPhoto(chatId, el.urlPic, {
        caption,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: 'Заказать',
                        callback_data: el.id
                    }
                ]

            ]
        }
    })
}
function orderCard(chatId, text, name, username) {
    if (state[chatId].cardId) {
        const id = state[chatId].cardId
        Card.findById(id).then(card => {
            const html = `Заявка на карту ${card.name} от ${text}, карта есть в базе, id карты ${card._id}, цена ${card.price}, никнейм заказчика ${username}, имя заказчика ${name}`
            mailer.mail(html)
            bot.sendMessage(chatId, '<b>Ваша заявка принята</b>', {
                reply_markup: {
                    remove_keyboard: true
                }, parse_mode: 'HTML'
            })
            delete state[chatId]
            delete videocards[chatId]
        })
    }
    else {
        const html = `Заявка на карту  от ${text}, карты нет в базе, цена ${card.price}, никнейм заказчика ${username}, имя заказчика ${name}`
        mailer.mail(html)
        bot.sendMessage(chatId, '<b>Ваша заявка принята</b>', {
            reply_markup: {
                remove_keyboard: true
            }, parse_mode: 'HTML'
        })
        delete state[chatId]
    }
}
function parseCard(chatId, arr, text) {
    const re = new RegExp('\\s', 'g');
    const urlParse = `https://market.yandex.ru/catalog/55314/list?text=${text}`.replace(re, '%20')
    const option = {
        url: urlParse,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
          'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Cookie':'dps=1.0; yandexuid=2192865601481460764; _ym_uid=1481464439957037806; fuid01=584d51c60ebf55fd.l6r8F6zTeQzLGrUjRGlxZef4yUKCEdS9gOnefNCHOZ3ECujcG6tJ5bT3Ia742TX6aSOPjxKEtLJB-9U1tMC02uBEMMOHFhMumk9yqkkbN4oye2Ff7CY4Tvs2ELfYjDcZ; mda=0; L=AX1HAVhNegdFU1ptf29EWk98VWNEVE5GDiAUOR0HBhksHDMcNyMu.1504679639.13243.326702.62c8bfc343a87277545588da620e8927; yandex_gid=197; yabs-frequency=/4/000C0000001fr4rQ/; zm=m-everything_index.webp.css%3Awww_Wt5E9cvzwB_3aQvadnqQF_cYB4E%3Al; Session_id=3:1515860389.5.0.1504679639626:qMe7sg:1d.1|452409244.0.2|175773.833889.j3Po8UfOMPeAEuzClckogqnKa-g; sessionid2=3:1515860389.5.0.1504679639626:qMe7sg:1d.1|452409244.0.2|175773.359859.eqUL1QK91P33v_7Sm1iJX1l9_uI; yandex_login=zhen.cowalencko; _ym_isad=2; i=puoLQ64jnlcGA8a/YqwEs7g4V7wb/6zSHIRqqGrNY60fNQsENybeVs6NCiioBdSrq4zgIQgLYy2JcDaT8tr+CAoytC0=; yp=1822159200.sp.family:0#1517512662.sd_popup_cl.1#1517511597.dswa.0#1517492292.dwbs.11#1517511597.dwss.39#1540576120.s_sw.1509040119#1820039639.udn.cDp6aGVuLmNvd2FsZW5ja28%3D#1517501971.dwhs.1#1545767764.p_sw.1514231763#1517463028.dwys.8#1820039639.multib.1#1517511597.dsws.59#1518536998.shlos.1#1518536998.los.1#1518536998.losc.0#1516554663.ygu.1#1520025323.cnps.6081866586:max#1545768563.p_cl.1514232563#1516516996.szm.1:1440x900:1440x780#1516025838.nps.92495383:close; ys=wprid.1515944168322419-1803496067955607251674822-man1-4529'
        }
    }
    request(option , (e, r, b)=>{
        if(e) throw e
        if(!e && r.statusCode===200){
            const $ = cheerio.load(b)
            let res = util.inspect(b)
            fs.writeFileSync('./i.html', res, {encoding: 'utf-8'})
            arr1 = []
            $('.n-snippet-card2').each((i, el)=>{
                const name = $(el).find('.n-link_theme_blue').text()//name
                const picUrl = 'https:' + $(el).find('img').attr('src')
                let desc = ''
                $(el).find('li').each((i, li)=>desc += $(li).text())
                const price1 = $(el).find('.n-snippet-card2__main-price').text()
                let price
                if(price1.match(/\d/))
                    price = price1.match(/\d/g).join('')
                else
                    price = price1
                arr1.push([i, name, picUrl, desc, price])
            })
        }
    
    })
    console.log(22)
    console.log(arguments)
    const arr1 = []

}
/////////////////////////////
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use('*', (req, res, next) => {
    console.log(req.url, req.method, req.body)
    next()
})
app.get('/', (req, res) => {
    let list = []
    Card.find({}).then(cards => {
        cards.forEach(card => {
            let plist = []
            plist.push(card._id)
            plist.push(card.name)
            plist.push(card.price)
            plist.push(card.urlPic)
            plist.push(card.urlDesc)
            list.push(plist)
            //console.log(plist)
        })
        //console.log(list)
        res.render('index', { el: 'Редактирование элементов', list: list })
    }).catch(e => console.log(e))

})

app.use(bodyParser.json())
app.post("/del", (req, res) => {
    //console.log(req.body)
    const el = req.body
    const id = el.uiid
    Card.findByIdAndRemove(id, (err, card) => {
        if (err)
            throw err
        res.send('ok')
    })
})
app.post("/edit", (req, res) => {
    //console.log(req.body)
    res.send('ok')
})
app.post("/add", (req, res) => {
    //console.log(req.body)
    const el = req.body
    if (!el.uiid)
        new Card(el).save().then(el => {
            //console.log(el)
            res.send(el._id)
        }).catch(e => console.log(e))
    else {
        const id = el.uiid
        //console.log('id ', id)
        delete el.uiid
        //console.log(el)
        Card.findByIdAndUpdate(id, { $set: el }, function (err, card) {
            if (err) throw err
            //console.log(card)
            res.send(card._id)
        })
    }
})
app.listen(process.env.PORT || 5000)