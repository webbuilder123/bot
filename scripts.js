($(function () {
    var el = ''
    $('body').css('background-color', '#eee')
    $('.add').click(function (event) {
        event.preventDefault()
        var name = $('input[name=name]').val(),
            price = $('input[name=price]').val(),
            urlPic = $('input[name=urlPic]').val(),
            urlDesc = $('textarea[name=urlDesc]').val(),
            uiid = $('input[name=uiid]').val()
        if (!name || !price || !urlPic || !urlDesc) {
            alert('заполните поля')
            return
        }
        var obj = {
            uiid: uiid,
            name: name,
            price: price,
            urlPic: urlPic,
            urlDesc: urlDesc
        }
        $.post("/add", obj, function () {
            2 + 1
        })
            .done(function (msg) {
                if (uiid)
                    $(el).parents('tr').remove()
                //alert(1)
                $('tbody').prepend('<tr><td><button class="btn btn-primary btn-xs edit">Править</button></button></td><td><button class="btn btn-danger btn-xs del">Удалить</button></td><td><div>' + msg + '</div></td><td><div>' + name + '</div></td><td><div>' + price + '</div></td><td><div>' + urlPic + '</div></td><td><div>' + urlDesc + '</div></td></tr>')
                el = ''
                $('input[name=uiid]').val('')
                $('input[name=name]').val('')
                $('input[name=price]').val('')
                $('input[name=urlPic]').val('')
                $('textarea[name=urlDesc]').val('')
            })
            .fail(function () {
                alert("Данные не отправлены");
            })
    })

    $('table').on('click', 'button.del', function (event) {
        event.preventDefault();
        self = this
        var uuid = $.trim($(this).parent().next().text())
        $.post("/del", {uiid: uuid}, function () {
            2 + 1
        })
            .done(function () {
                //alert(1)
                $(self).parents('tr').remove()    
            })
            .fail(function () {
                alert("Данные не отправлены");
            })
    })

    $('table').on('click', 'button.edit', function (event) {
        event.preventDefault();
        var uuid = $(this).parent().next().next().text()
        el = this
        console.log(el)
        $('input[name=uiid]').val($.trim($(this).parent().next().next().text()))
        $('input[name=name]').val($.trim($(this).parent().next().next().next().text()))
        $('input[name=price]').val($.trim($(this).parent().next().next().next().next().text()))
        $('input[name=urlPic]').val($.trim($(this).parent().next().next().next().next().next().text()))
        $('textarea[name=urlDesc]').val($.trim($(this).parent().next().next().next().next().next().next().text()))
    })

    $('.res').click(function (event) {
        el = ''
        $('input[name=uiid]').val('')
        $('input[name=name]').val('')
        $('input[name=price]').val('')
        $('input[name=urlPic]').val('')
        $('textarea[name=urlDesc]').val('')
    })
}))