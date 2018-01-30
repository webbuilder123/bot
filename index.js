const TB = require('node-telegram-bot-api')
const cheerio = require('cheerio')
const mongoose = require('mongoose')
const request = require('request')
const underscore = require('underscore')
const express = require('express')
const path = require('path')
///////////////////////////////
const config = require('./config')
const kb = require('./kb-keys')
const keyboards = require('./keyboards')
const helpers = require('./helpers')
//////////////////////////////
require('./card-model')
const Card = mongoose.model('card')
/////////////////////////////
let app = express()
app.set("view engine", "ejs")
app.use('/src',  express.static(path.join(__dirname, '/src')))
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
    const text = msg.text
    console.log(text)
    findCard(text)
})
/////////////////////////////
function sendHTML(chatId, html, kbName = null) {
    options = {
        parse_mode: 'HTML'
    }
    if (kbName)
        options.reply_markup = {
            keyboards: keyboards[kbName]
        }

    bot.sendMessage(chatId, html, options)
}
function findCard(text){
    Card.find({}).then(cards=>{
        console.log(cards)
        for(card of cards)
            console.log(card)
    }).catch(e=>console.log(e))
}
/////////////////////////////
app.get('/', (req, res)=>{
    res.render('index', {el: 'Редактирование элементов', list:[['hi', 'hello']]})
})
app.listen(process.env.PORT || 5000)