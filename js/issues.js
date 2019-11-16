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
    var new_img = $("<img alt=...>").attr({ src: "caomei.gif" });
    new_p.append(new_img);
    div1.append(new_p);
    $(".carousel-inner").append(div1);
    new_img.attr("src", "images/" + image_name);
    new_img.attr("image_name", image_name);
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

    $("#image" + cover).attr("src", window.images_dir + image_name);
    $("#image" + cover).attr("image_name", image_name);
    return;

}

//为创建数据库则创建数据库（名字是animeimages），table名叫images，主键keyPath叫image_name
//记住传入参数data是JSON格式数据,理论上只要包含image_name字段，其余任意
function indexedDB_addinfo(data) {
    let request = window.indexedDB.open("animeimages", 1);
    request.onupgradeneeded = (ev) => {
        let db = ev.target.result;
        if (!db.objectStoreNames.contains("images")) {
            let objectStore = db.createObjectStore("images", {
                keyPath: "image_name"
            });
        }
    }

    request.onsuccess = (ev) => {
        let db = ev.target.result;
        let transaction = db.transaction(["images"], 'readwrite');

        transaction.oncomplete = function(event) {
            console.log("addinfo ok");
        };
        transaction.onerror = function(event) {
            console.log("ERROR:" + transaction.error);
        };

        let objectStore = transaction.objectStore("images");
        let objectStoreRequest = objectStore.add(data);

        objectStoreRequest.onsuccess = function(event) {};
    }
}

function indexedDB_getall() {
    return new Promise((resolve, reject) => {

        var image_names = new Array();

        let request = window.indexedDB.open("animeimages", 1);
        request.onupgradeneeded = (ev) => {
            let db = ev.target.result;
            if (!db.objectStoreNames.contains("images")) {
                let objectStore = db.createObjectStore("images", {
                    keyPath: "image_name"
                });
            }
        }

        request.onsuccess = (ev) => {
            var image_names = new Array();
            let db = ev.target.result;
            var transaction = db.transaction("images");

            transaction.oncomplete = function(event) {
                console.log("get transaction complete");
                //cursor遍历数据库结束后出发此事件，在此对image_names数据（保存了以前看过的所有的images图片进行操作)
                console.log(image_names);
                resolve(image_names);
            }
            transaction.onerror = function(event) {
                console.log("ERROR:" + transaction.error);
            }

            var objectStore = transaction.objectStore("images");
            var cursor_request = objectStore.openCursor();
            cursor_request.onsuccess = function(e) {
                var cursor = e.target.result;
                if (cursor) {
                    var current = cursor.value;
                    image_names.push(current.image_name);
                    cursor.continue();
                }
            }
        }
    })
}

//当点下按钮请求加载indexedDB存储的以前看过的所有图片时，直接前端操作不用涉及到后端，
//把url构造成 images/+image_name 做成轮播框加到当前轮播后面即可。(是不是要设计一个按钮直接跳转到最后一张图片以及最前面一张图片呢？)
function load_previous_image() {
    var image_name;
    var image_names = new Array();
    indexedDB_getall().then(function(image_names) {
        for (var i = 0; i < image_names.length; i++) {
            image_name = image_names[i];
            new_carousel_inner(image_name); //新增加一群轮播框存储图片
        }

        window.current = window.current; //current值不变，total要加
        window.total = window.total + image_names.length;
    })
}

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

//点击加载此前显示过的全部图片的按钮所要进行的事务
//由于getall的异步操作，此处失效，要改。。。
$("#loadprevious").click(function() {
    load_previous_image();
})