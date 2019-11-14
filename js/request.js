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

function ajax_request(signal, callback, slide) {
    var image_name = "aaa";
    //signal=2，点击next，传下一张图片的image_name

    //如果有slide值并且值为prev，表示向前翻，要得到前一张图片的image_name
    //               值为next，表示向后翻，要得到后一张图片的image_name
    if (slide) {
        if (slide == "prev") image_name = $("div.active").prev().find("p").find("img").attr("image_name");
        else if (slide == "next") image_name = $("div.active").next().find("p").find("img").attr("image_name");
        else $("#change_info").text("不要篡改数据");
    } else image_name = $("div.active p img").attr("image_name");

    image_name = image_name ? image_name.replace("\n", "") : null;

    var data = {
        "signal": signal,
        "image_name": image_name,
    }
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

//定义全局变量window.current,window.total
/**
 * 1. 如果window.current值为<total，点next ajax请求请求的不是图片的url，是下一张图片h不h,点previous不希望跳到最后一张（或者是第三张图片）,即什么都不发生
 * 2. 如果window.current值为=total,点next进行ajax请求，点previous进行ajax请求
 */

//signal=1,最初刚进入页面请求三张图片url
window.onload = function() {
    stop_image1_prev();
    $("#hideshow").css("display", "None");
    $("#change_info").text("");
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
        indexedDB_addinfo({ "image_name": response[0] });
        indexedDB_addinfo({ "image_name": response[1] });
    })
}

//signal=2,点击id为next的<a>标签请求翻到下一页图片时出发，请求一张图片的url
//具体实现时，先加入一个新的框，src为loading提示图片，ajax请求有返回值时，替换src
$("#next").click(function(e) {

    //在最开始就清空提示行哦，，反正一般有一个操作就应该进行一次清空
    $("#change_info").text("");

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
            $("#deletereserve").text("不h"); //ajax请求了下一张图片后更新button值
            $("#deletereserve").attr("role", "delete");

            indexedDB_addinfo({ "image_name": image_name });
            window.total = window.total + 1; //全局变量晋升
            window.current = window.current + 1;
        })
    } else { //向后翻不请求即加载已看过的图片，也要更新按钮值
        ajax_request(3, function(response) {
            //有请求返回值确定展示 删除 或 取消删除按钮
            if (response == 1) {
                $("#deletereserve").text("不h");
                $("#deletereserve").attr("role", "delete");
            } else {
                $("#deletereserve").text("挺h的");
                $("#deletereserve").attr("role", "reserve");
            }
        }, slide = "next")
        window.current = window.current + 1;
    }
})


//signal=3,点击id为previous的<a>标签请求翻到上一页图片是发出，请求上一张图片的是否被删除
//需要向后端额外传入参数前一张图片的名字(这个在ajax中直接实现了，四个请求都传）
$("#previous").click(function() {

    $("#change_info").text("");

    if (window.current > window.total) window.current = window.total; //卑微防出错

    //如果是第一张图片，什么都不做
    //不是第一张图片时
    if (window.current != 1) {
        ajax_request(3, function(response) {
            //有请求返回值确定展示 删除 或 取消删除按钮
            if (response == 1) {
                $("#deletereserve").text("不h");
                $("#deletereserve").attr("role", "delete");
            } else {
                $("#deletereserve").text("挺h的");
                $("#deletereserve").attr("role", "reserve");
            }
        }, slide = "prev")
        window.current = window.current - 1; //在不是第一张图片的情况下往回翻，current数减一
    }
})

//signal=4,点击删除按钮，发出将此图片yellow值1改为0的请求，并写processed值为1
//signal=5则反之