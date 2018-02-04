const TB = require('node-telegram-bot-api')
const cheerio = require('cheerio')
const mongoose = require('mongoose')
const request = require('request')
const underscore = require('underscore')
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
//const util = require('util')
//const fs = require('fs')
const S = require('string')
const state = {}
const videocards = {}
const db = {}
const time = {}
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
    //console.log('msg')
    //console.log(state)
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
    if(videocards[queryID]){
        state[queryID] = { cardId: id, date: Date.now(), name: '' }
        sendHTML(queryID, 'Отправьте контактную информацию и мы свяжемся с Вами', 'back')
    }
    else
        sendHTML(queryID, 'Состояние устарело, посторите запрос заново')
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
    time[chatId] = {date: Date.now()}
    const arr = text.split(' ')
    Card.find({}).then(cards => {
        //console.log(cards)
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
                //console.log(videocards[chatId])
                let html = ''
                const keys = Object.keys(videocards[chatId])
                keys.forEach(key=>{
                    //console.log(videocards[chatId][key])
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
    if(state[chatId].cardId && db[chatId] && db[chatId][(state[chatId].cardId)]){
        const id = state[chatId].cardId
        const card = db[chatId][id]
        //console.log(card)
        const html = `Заявка на карту ${card.name} от ${text}, карты нет в базе, ссылка на маркете  https://market.yandex.ru/${card.curlc}, цена ${card.price}, описание ${card.desc}, никнейм заказчика ${username}, имя заказчика ${name}`
        mailer.mail(html)
        bot.sendMessage(chatId, '<b>Ваша заявка принята</b>', {
            reply_markup: {
                remove_keyboard: true
            }, parse_mode: 'HTML'
        })
        delete state[chatId]
    }
    else if (state[chatId].cardId) {
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
        })
    }
    else
        bot.sendMessage(chatId, '<b>Какая-то ошибка</b>', {
            reply_markup: {
                remove_keyboard: true
            }, parse_mode: 'HTML'
        })
}
function parseCard(chatId, arr, text) {
    db[chatId] = {}
    const re = new RegExp('\\s', 'g');
    const urlParse = `https://market.yandex.ru/catalog/55314/list?text=${text}`.replace(re, '%20')
    const option = {
        url: urlParse,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36',
          'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Cookie':'yandexuid=9896389531504700533; _ym_uid=1505673586754509952; mda=0; fuid01=5a3b52283a35f20b.pewDViZe2wmywb098fMxNZFXYs70vVLvVnPfii5r5Z5yeqreXK_0R6V_JCG9WuKnS4BfDynhh_W1xd-bot-V6RFI4Di5KRnn8lItAss7KLbgNKcPsTc_kPpd8-X9ktfI; L=SXJXfFhqfHxFA2JHA3F7b0FwX2J/Xnp3AiUMUQs+EzRPEh4dFTM=.1516030641.13379.341935.ab43f4aa9c0eefd0c1e14ab6e9d35121; yabs-frequency=/4/00010000003nqLnQ/Er2mSFmj8TSySd3yBI00/; my=YwA=; _ym_isad=1; Session_id=3:1517757189.5.0.1516030641681:_jK7sg:10.1|588115325.0.2|176841.702567.FKHYdJnnra8Ul_THjpKclq5cKNU; sessionid2=3:1517757189.5.0.1516030641681:_jK7sg:10.1|588115325.0.2|176841.495450.-_adQk00ewPD-YoyLYOR8nAQ6Bw; yandex_login=sozdatel.botov; yandex_gid=197; i=FFiJcjbbEKYt0AOGIizUWuEYeoHXOU/0RJ69+mo2W8M1jMwQR2BC9vFU7birJQRYyeNGOXKJ2ezaqbVPCxzKfhNfbeY=; ys=wprid.1517759894773615-1534395029072736341567634-vla1-2438; yp=1520349991.ygu.1#1549203528.old.1#1518363636.szm.1:1440x900:1440x780#1520351896.shlos.1#1520351896.los.1#1520351896.losc.0#1549295896.p_sw.1517759895; uid=/sYr8Fp3MMyA6wDMPT7vAg==; _ym_visorc_160656=b; _ym_visorc_45411513=b; HISTORY_AUTH_SESSION=8ef2438d; currentRegionId=197; currentRegionName=%D0%91%D0%B0%D1%80%D0%BD%D0%B0%D1%83%D0%BB; ugc-poll-asked=true; fonts-loaded=1; parent_reqid_seq=232048d8f6979d94394246edd96c2cc8%2C7a6275bf9fc6900c716dd360b92388fa; head-banner=%7B%22closingCounter%22%3A0%2C%22showingCounter%22%3A7%2C%22shownAfterClicked%22%3Afalse%2C%22isClicked%22%3Afalse%7D'
        }
    }
    request(option , (e, r, b)=>{
        if(e) throw e
        if(!e && r.statusCode===200){
            const $ = cheerio.load(b)
            //let res = util.inspect(b)
            //fs.writeFileSync('./i.html', res, {encoding: 'utf-8'})
            const dt = Number(String(Date.now()).substr(-7, 5))
            $('.n-snippet-card2').each((i, el)=>{
                const name = $(el).find('.n-link_theme_blue').text()//name
                const curlc = $(el).find('.n-link_theme_blue').attr('href')
                const picUrl = 'https:' + $(el).find('img').attr('src')
                let desc = ''
                $(el).find('li').each((i, li)=>desc += $(li).text()+' ')
                const price1 = $(el).find('.n-snippet-card2__main-price').text()
                let price
                if(price1.match(/\d/))
                    price = price1.match(/\d/g).join('')
                else
                    price = price1
                db[chatId][dt+i]={name, picUrl, desc, price, curlc}
                videocards[chatId]['/c'+(dt+i)] = {
                    caption : `<b>Модель</b>: ${name}\n<b>Цена</b>: ${price}\n<b>Описание</b>: ${desc}`,
                    urlPic : picUrl,
                    id: (dt+i)
                }
            })
            let html = ''
            const keys = Object.keys(videocards[chatId])
            keys.forEach(key=>{
                //console.log(videocards[chatId][key])
                html += `${key}\n${videocards[chatId][key].caption}\n\n`
            })
            if(Object.keys(db[chatId]).length == 0)
                sendHTML(chatId, '<b>Ничего не найдено, попробуйте изменить запрос</b>')
            else
                sendHTML(chatId, `
            Мы нашли для вас следующие варианты:\n${html}\n`)
            //console.log(db)
            //console.log(videocards)
        }
        else
            sendHTML(chatId, 'Попробуйте позже')
    
    })
}
(function destroy(){
  const timeKeys = Object.keys(time)
  if(timeKeys.length>0)
    timeKeys.forEach(key=>{
        if(time[key].date && (Date.now() - time[key].date) > 1000*60*60){
            if(videocards[key])
                delete videocards[key]
            if(db[key])
                delete db[key]
            if(state[key])
                delete state[key]
            if(time[key])
                delete time[key]
        }
    })
    setTimeout(destroy, 15*60*1000)  
})()
/////////////////////////////
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use('*', (req, res, next) => {
    //console.log(req.url, req.method, req.body)
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