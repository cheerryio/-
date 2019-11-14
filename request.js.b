/**
 * @Filename:request.js(被display.html引用)
 * @Author:
 * @Description:全部使用ajax请求
 *        1. 一开始进入时发送ajax请求服务器直接返回三张图片用来展示
 *        2. 会翻下一页同时向服务器请求下一张图片，服务器从session获取当前image id号
 *        3. 会翻上一页同时向服务器请求回到未翻这一页是的状态（即找回一张消失图片的url，用session保存的这张url哦）
 *        4. 点击删除键，会在数据库更新当前image（通过session中id）是否yellow，并process值更新，同时返回下一张图片
 * 
 *        值得庆幸的是，没有什么数据需要前段去给，只需要用数字1,2,3,4去标识上述四种不同目的的请求即可
 *        现在决定，每消失一张图片都写到indexdb里边，以便想看哦
 */

//定义ajax请求基础，所有请求都用它

function ajax_request(signal, callback) {
    var data = {
        "signal": signal,
        "image_name": $("div.active p img").attr("image_name"),
    };
    data = JSON.stringify(data);
    $.ajax({
        type: "post",
        url: "lib/main.php",
        contentType: "application/json;charset=utf-8",
        async: false,
        data: data,
        success: function(response) {
            callback(response);
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(xhr.status);
            console.log(thrownError);
        }
    })
}

function stop_image1_prev() {
    $('#myCarousel').on("slide.bs.carousel", function(event) {
        var $hoder = $("#myCarousel").find('.item'),
            $items = $(event.relatedTarget);
        //getIndex就是轮播到当前位置的索引
        var getIndex = $hoder.index($items);
        if (getIndex == 0) $("#previous").attr("data-slide", null);
        else $("#previous").attr("data-slide", "prev");
    })
}

function new_carousel_inner(image_name) {
    var div1 = $("<div class='item'></div>");
    var new_p = $("<p class='text-center'></p>");
    var image_path = "images/" + image_name;
    var new_img = $("<img alt=...>").attr({ src: "caomei.gif" }).attr({ image_name: image_name });
    new_p.append(new_img);
    div1.append(new_p);
    $(".carousel-inner").append(div1);
    new_img.attr("src", image_path);
    return;
}

function role_carousel_inner(current, total, image_name) {

    //判断current是否1-3且为整数，否则错误输入不处理
    if (!(current < 3 && current > 0 && Math.floor(current) == current && Math.floor(total) == total)) return false;

    //cover值为覆盖src的位置
    var cover;
    if (current + 1 == total) cover == total;
    else cover = (current + 1) % total;
    print(cover);

    $("#image" + cover).attr("src", "images/" + image_name);
    $("#image" + cover).attr("image_name", image_name);
    return;

}

//定义全局变量window.current,window.total
/**
 * 1. 如果window.current值为<total，点next ajax请求请求的不是图片的url，是下一张图片h不h,点previous不希望跳到最后一张（或者是第三张图片）,即什么都不发生
 * 2. 如果window.current值为=total,点next进行ajax请求，点previous进行ajax请求
 */

//signal=1,最初刚进入页面请求三张图片url
window.onload = function() {
    stop_image1_prev();
    //初始化全局变量
    window.total = 2;
    window.current = 1;
    ajax_request(1, function(response) {
        //返回response直接是一个数组，用[0],[1]得到值
        //将返回的二张图片的url分配给二个播放器
        response = JSON.parse(response);
        $("#image1").attr("src", "images/" + response[0]);
        $("#image2").attr("src", "images/" + response[1]);
        $("#image1").attr("image_name", response[0]);
        $("#image2").attr("image_name", response[1]);
    })
}

//signal=2,点击id为next的<a>标签请求翻到下一页图片时出发，请求一张图片的url
//具体实现时，先加入一个新的框，src为loading提示图片，ajax请求有返回值时，替换src
$("#next").click(function(e) {

    if (window.current > window.total) window.current = window.total; //卑微的防止出错

    //只有ajax请求成功才能使total current晋升（current==total），当普通请求只导致current晋升
    if (window.current == window.total) {
        ajax_request(2, function(response) {
            var image_name = response;

            /**
             * 如果加入新图片的选择:
             *      Option1:新加入一个div作轮播图片框，全面所有的图片都保存不会消失
             *      Option2:类似循环队列，一共只有二个图片轮播框，循环
             */
            new_carousel_inner(image_name);

            window.total = window.total + 1; //全局变量晋升
            window.current = window.current + 1;
        })
    } else window.current = window.current + 1;
})


//signal=3,点击id为previous的<a>标签请求翻到上一页图片是发出，请求上一张图片的是否被删除
//需要向后端额外传入参数前一张图片的名字(这个在ajax中直接实现了，四个请求都传）
$("#previous").click(function() {

    if (window.current > window.total) window.current = window.total; //卑微防出错

    //如果是第一张图片，什么都不做
    //不是第一张图片时
    if (window.current != 1) {
        ajax_request(3, function(response) {
            //有请求返回值确定展示 删除 或 取消删除按钮
            if (response == 1) {
                $("#deletereserve").text("不够h");
                $("#deletereserve").attr("role", "delete");
            } else {
                $("#deletereserve").text("挺h的");
                $("#deletereserve").attr("role", "reserve");
            }
        })
        window.current = window.current - 1; //在不是第一张图片的情况下往回翻，current数减一
    }
})

//signal=4,点击删除按钮，发出将此图片yellow值1改为0的请求，并写processed值为1
//signal=5则反之
//前端会弹出删除成功的标识，按钮删除字样将变成取消删除
$("#deletereserve").click(function() {
    if ($("#deletereserve").attr("role") == "delete") {
        ajax_request(4, function(response) {
            //发送四将黄改为不黄，增加提示信息"更新图片性质 --不黄"
            $("#deletereserve").text("挺h的");
            $("#deletereserve").attr("role", "reserve");
            $("#change_info").text("成功更新图片性质 --不黄");
        })
    } else if ($("#deletereserve").attr("role") == "reserve") {
        ajax_request(5, function(response) {
            $("#deletereserve").text("不h");
            $("#deletereserve").attr("role", "delete");
            $("#change_info").text("成功更新图片性质 --黄");
        })
    } else {
        //当用户乱改button组件的role值情况
        $("#change_info").text("请勿胡乱修改页面元素");
    }
})