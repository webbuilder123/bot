const mongoose = require('mongoose')
const Schema = mongoose.Schema

const CardSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    urlPic: {
        type: String,
        default: 'https://teleporto.ru/images/detailed/13622/1016189165.jpg?t=1499603463'
    }
})

mongoose.model('card', CardSchema)