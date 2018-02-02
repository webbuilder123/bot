const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CardSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: String,
        default: 'По запросу'
    },
    urlPic: {
        type: String,
        default: 'https://teleporto.ru/images/detailed/13622/1016189165.jpg?t=1499603463'
    },
    urlDesc: {
        type: String,
        default: ''
    }

})

mongoose.model('card1', CardSchema)