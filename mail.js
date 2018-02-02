const nodemailer = require('nodemailer')
module.exports = {
	mail: (body)=>{
		nodemailer.createTestAccount((err, account) => {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
       /* host: 'imap.yandex.ru',
        port: 465,
        secure: true, // true for 465, false for other ports*/
		service: 'Gmail',
        auth: {
            user: 'aivanov19991', // generated ethereal user sozdatel.botov@yandex.ru
            pass: '1kel9911'  // generated ethereal password 1kel991
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"Телеграм бот" <aivanov19991@gmail.com>', // sender address
        to: 'zhen.cowalencko@yandex.ru, church30@mail.ru', // list of receivers
        subject: 'Заявка на видеокарту', // Subject line
        html: body // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        //console.log('Message sent: %s', info.messageId);
        // Preview only available when sending through an Ethereal account
        //console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@blurdybloop.com>
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
});

	}
}
