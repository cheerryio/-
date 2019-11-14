
<?php

/**
    *@Author:
    *@Description:主要处理图片的获取和删除和取消删除操作
    *@Process:
    *    一 .关于前端的内容
    *        1. 用户通过点击删除按钮，发送自己是否要删除这一张图片的信息，服务器返回下一张图片的url
    *            如果不点删除用户直接翻页，同样直接返回下一个url
    *        2. 如果用户想要取消上一张图片的删除操作，或者想去删除上一张图片
    *            会先点击向左滑动返回上一张图片，服务器返回上一张图片是否删除（通过session）
    *            删除则按钮显示取消删除，否侧显示删除
    *        3. 有一个东西似乎没有考虑到，前段滑动栏似乎只有三栏可以滑动，那么怎么做到保持当天看的图片永远是处在中间的位置的呢？
    *           解决办法是把carousel indicator去掉，就看不出有几个啦还是能滑
    *    二 .关于对返回何图片何数据的处理
    *        1. 为了多人协同完成图片处理工作，需要对各个用户返回的是未被处理的第一个
    *            意味着已经返回过的图片要增加标记（在数据库中），因为考虑到每一个人拿到的图片都独一无二的
    *            写数据库的操作（写是否删除被删除)不需要上锁，从数据库拿图片需要上锁，并增添标记此图片已经被处理过
    *        2. to be continued
*/

/**
 * @Description:create_lock方法上文件锁，release_lock方法解锁
 */

include_once("handlers.php");

header("Content-Type:text/plain;charset=utf-8");

if($_SERVER["REQUEST_METHOD"]=="POST"){
    $data=json_decode(file_get_contents("php://input"),true);   //通过这个奇怪的东西获得前段application/json格式的数据(JSON.stringify过的)
    if(isset($data["signal"])){
        $ilock=new FileLock();
        $mysqlopt=new MysqlOpt();
        $file_handler=new FileHandler();
        $signal=$data["signal"];
        switch($signal){
            //signal=1,返回下三张图片url(此操作需要上锁）
            case 1:
                $mysqlopt->connect();
                if(!$ilock->create_lock()) die("cant create lock");

                //已上锁，进行上锁后的操作
                if(!($processid=$file_handler->load_process())){
                    die("cant get process file ...");
                }
                $image_names=$mysqlopt->get_two_images();
                echo json_encode($image_names);

                $ilock->release_lock();
                $mysqlopt->close();
                break;

            //signal=2,返回下一张图片的url(记住是processed=0的图片),需要加锁，防止取同一个图片
            //并把用户方面当前图片processed设为1
            case 2:
                $mysqlopt->connect();
                if(!$ilock->create_lock()) die("cant create lock");

                //先获得下一张图片名字，在把所有叫这个名字的图片的processed都变1
                $image_name=$mysqlopt->get_next_image();
                $mysqlopt->update_process($image_name);
                echo $image_name;

                $ilock->release_lock();
                $mysqlopt->close();
                break;

            //signal=3,前端数据是上一张图片名字，后端返回上一张图片是否删除，不上锁
            case 3:
                $mysqlopt->connect();

                if(isset($data["last_image_name"])){
                    $last_image_name=$data["last_image_name"];
                    $yellow=$mysqlopt->get_yellow($last_image_name);
                    echo $yellow;
                }

                $mysqlopt->close();
                break;

            //signal=4,将当前图片的的yellow值设为0
            case 4:
                if(isset($data["image_name"])){
                    $image_name=$data["image_name"];
                    $mysqlopt->connect();
                    $mysqlopt->update_yellow($image_name,0);
                    $mysqlopt->close();
                }else die("wrong request for update yellow");
                break;

            //signal=5,将1当前图片的yellow值设为1
            case 5:
            if(isset($data["image_name"])){
                $image_name=$data["image_name"];
                $mysqlopt->connect();
                $mysqlopt->update_yellow($image_name,1);
                $mysqlopt->close();
            }else die("wrong request for update yellow");
            break;
        }
    }
}

?>