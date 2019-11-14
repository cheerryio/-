<?php

interface iLock
{
    public function __construct($keyword);
    public function locker_filepath();
    public function create_lock();
    public function release_lock();
}   

interface Mysql
{
    public function connect();
    public function close();
    public function get_two_images();
    public function update_yellow($image_name,$is_yellow);
    public function update_process($image_name);
    public function get_next_image();
    public function get_yellow($image_name);
}

interface filehandlerinterface
{
    public function load_process();
    public function save_process($processid);
}

class FileLock implements iLock{

    private $lock_dir="/tmp";
    private $fp="";
    private $file_path="";
    public $keyword="";

    public function __construct($keyword=""){
        $this->keyword=empty($keyword)?"lock":$keyword;
        return ;
    }

    public function locker_filepath(){
        return md5($this->keyword."mengbao").".txt";
    }

    public function create_lock(){
        $this->file_path=$this->lock_dir."/".$this->locker_filepath();
        $this->fp=fopen($this->file_path,"a+b");    #由于这些函数的锁机制吧，多一个上锁的文件进行fopen操作，会等待（阻塞），不会报错退出
        if(!$this->fp){
            return false;
        }
        if(flock($this->fp,LOCK_EX)){   #exclusive lock 排它锁，此方法加锁其他程序根本无法访问此文件
            return true;
        }
    }

    public function release_lock(){
        flock($this->fp,LOCK_UN);       #LOCK_UN 参数进行解锁
        fclose($this->fp);
    }

}

class MysqlOpt implements Mysql{

    const USER="root";
    const PASSWORD="123456";
    const NOTYELLOW=0;
    const PROCESSED=1;
    const DATABASE="images";
    const TABLE="animeimages";

    public $user=self::USER;
    private $password=self::PASSWORD;
    private $database=self::DATABASE;
    private $table=self::TABLE;

    public $dbh=NULL;

    #使用PDO连接mysql数据库
    public function connect(){
        try{
            $this->dbh=new PDO("mysql:host=localhost;dbname=".$this->database,$this->user,$this->password,array(
                PDO::ATTR_PERSISTENT=>true      #启动长时间连接
            ));
        }catch(PDOException $e){
            die("Error:".$e->getMessage()."<br/>");     #无法连接错误则程序终止
        }
    }

    public function close(){
        $this->dbh=NULL;
    }

    //前段刚进入网页是即请求二张图片，后端返回前二张未被处理的图片
    public function get_two_images(){
        $image_names=array();
        $sql1="SELECT image_name FROM animeimages WHERE processed=0 LIMIT 2";
        $stmt=$this->dbh->prepare($sql1);
        $stmt->execute();
        while($row=$stmt->fetch(PDO::FETCH_ASSOC)){
            $image_name=$row["image_name"];
            array_push($image_names,$image_name);
            $this->update_process($image_name);     #对返回的图片看作是已处理
        }
        return $image_names;
    }

    #bindParam方法默认在原来的位置上加上'   '也就是默认str类型，
    #因此table_name只能自己写让不能bind赋值
    #如果要使用int类型数据则   PDO::PARAM_INT
    #is_yellow变量可以用来表示此图不是黄图，形式上忽略此图，或取消删除操作
    public function update_yellow($image_name,$is_yellow){
        $sql="UPDATE animeimages SET yellow=:not_yellow WHERE image_name=:image_name";
        $stmt=($this->dbh)->prepare($sql);
        $stmt->bindParam(":not_yellow",$yellow,PDO::PARAM_INT);
        $stmt->bindParam(":image_name",$image_name);
        $yellow=$is_yellow;     //为绑定好的参数进行赋值
        $image_name=$image_name;
        $stmt->execute();
    }

    #函数只能进行将processed赋值为1，表示已经操作处理过，无法进行逆向操作
    public function update_process($image_name){
        $sql="UPDATE animeimages SET processed=1 WHERE image_name=:image_name";
        $stmt=($this->dbh)->prepare($sql);
        $stmt->bindParam(":image_name",$image_name);
        $image_name=$image_name;        //为绑定好的参数进行赋值
        $stmt->execute();
        return ;
    }

    #理论上此函数需要加锁，防止不同人拿到同一个图片就不好了
    #加锁操作在main函数里面进行，尽量别让一个类里混入了另一个类的操作
    public function get_next_image(){
        $sql="SELECT image_name FROM animeimages WHERE processed=0 LIMIT 1";
        $stmt=$this->dbh->prepare($sql);
        $stmt->execute();
        while($row=$stmt->fetch(PDO::FETCH_ASSOC)){
            $image_name=$row["image_name"];
        }
        if(!$image_name) die("err get next image_path");
        return $image_name;
    }

    public function get_yellow($image_name){
        $sql="SELECT yellow FROM animeimages WHERE image_name=:image_name";
        $stmt=$this->dbh->prepare($sql);
        $stmt->bindParam(":image_name",$image_name);
        $stmt->execute();
        while($row=$stmt->fetch(PDO::FETCH_ASSOC)){
            $yellow=$row["yellow"];
        }
        if(!$yellow) die("err get if yellow");
        return $yellow;
    }
}

class FileHandler implements filehandlerinterface{

    const NOWPROCESSFILE="nowprocess.txt";

    private $nowprocess_file=self::NOWPROCESSFILE;

    public function load_process(){
        $fp=fopen($this->nowprocess_file,"r");
        if(!$fp){
            return false;
        }
        $processid=fread($fp,filesize($this->nowprocess_file));
        fclose($fp);
        return $processid;
    }

    public function save_process($processid){
        $fp=fopen($this->nowprocess_file,"w+");
        if(!$fp){
            return false;
        }
        fwrite($fp,$processid);
        fclose($fp);
        return true;
    }

}

?>