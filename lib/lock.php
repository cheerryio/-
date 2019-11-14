<?php

/**
 * @Filename:lock.php
 * @Author:
 * @Description:create_lock方法上文件锁，release_lock方法解锁
 */

interface iLock
{
    public function __construct($keyword);
    public function locker_filepath();
    public function create_lock();
    public function release_lock();
    public function test();
}   

class fileLock implements iLock{

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
        $this->fp=fopen($this->file_path,"a+b");
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

?>