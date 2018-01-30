module.exports = {
    start(){
        console.log('bot was started')
    },
   chatId(msg){
        return msg.chat.id
    },
    queryUserId(query){
        return query.from.id
    },
    queryChatId(query){
        return query.message.chat.id
    },
    queryId(query){
        return query.id
    },
    telegramId(msg){
        return msg.from.id
    }

}