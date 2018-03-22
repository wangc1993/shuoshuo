let formidable = require('formidable');
let db = require('../models/db.js');
let md5 = require('../models/md5.js');
let path = require('path');
let fs = require('fs');
let gm = require('gm');

/*显示首页*/
exports.showIndex = function(req,res,next){
    if(req.session.login == '1'){
        db.find('users',{'username':req.session.username},function(err,result){
                let avatar = result[0].avatar;
                res.render('index',{
                'login': true,
                'username': req.session.username,
                'active': '首页',
                'avatar': avatar
            });
        });
    }else{
            res.render('index',{
            'login': false,
            'username': '',
            'active': '首页',
            'avatar': 'moren.jpg'
        });
    }
}
/*显示注册页面*/
exports.showRegister = function(req,res,next){
    res.render('register',{
        'login': req.session.login == '1' ? true : false,
        'username': req.session.login == '1' ? req.session.username : '',
        'active': '注册'
    });
}
/*注册业务*/
exports.doRegister = function(req,res,next){
    /*得到用户的数据*/
    let form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        /*得到表单之后做的事*/
        let username = fields.username;
        let password = fields.password;
        /*查询数据库中是否存在目标用户*/
        db.find('users',{'username':username},function(err,result){
            if(err){
                /*服务器错误*/
                res.send('-2');
                return;
            }
            if(result.length != 0){
                /*存在目标用户*/
                res.send('-1');
                return;
            }
            /*设置MD5加密*/
            password = md5(md5(password) + 'wc');
            /*向数据库中国保存用户*/
            db.insertOne('users',{
                'username': username,
                'password': password,
                'avatar': 'moren.jpg'
            },function(err,result){
                if(err){
                    /*数据库错误*/
                    res.send('-2');
                    return;
                }
                /*注册成功，写入session*/
                req.session.login = '1';
                req.session.username = username;
                res.send('1');
            });
        });
    });
}
/*显示登录页面*/
exports.showLogin = function(req,res,next){
    res.render('login',{
        'login': req.session.login == '1' ? true : false,
        'username': req.session.login == '1' ? req.session.username : '',
        'active': '登录'
    });
}
/*登录业务*/
exports.doLogin = function(req,res,next){
    /*得到用户表单*/
    let form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        /*得到表单之后做的事*/
        let username = fields.username;
        let password = fields.password;
        let passwordMD5 = md5(md5(password) + 'wc');
        /*console.log(username + " " + password);*/
        /*查询数据库中是否存在目标用户*/
        db.find('users',{'username':username},function(err,result){
            if(err){
                res.send('-5');
                return;
            }
            if(result.length == 0){
                /*没有此用户*/
                res.send('-1');
                return;
            }
            /*有此用户，匹配密码*/
            if(passwordMD5 == result[0].password){
                req.session.login = '1';
                req.session.username = username;
                /*登录成功*/
                res.send('1');
                return;
            }else{
                /*密码错误*/
                res.send('-2');
                return;
            }
        });
    });
    /*查询数据库，匹配用户*/
}
/*显示上传图片*/
exports.showUpload = function(req,res,next){
    /*上传头像必须保持登录状态*/
    /*if(req.session.login != '1'){
        res.write('<head><meta charset="utf-8"/></head>');
        res.end('非法闯入！此页面需要登录');
        return;
    }*/
    res.render('upload',{
        'login': true,
        'username': req.session.username || '小花花',
        'active': '修改头像'
    });
}
/*上传图片业务*/
exports.doUpload = function(req,res,next){
    let form = new formidable.IncomingForm();
    /*设置上传文件夹,path.normalize(p)由于该方法属于path模块，使用前需要引入path模块（var path= require(“path”) ）*/
    form.uploadDir = path.normalize(__dirname + '/../avatar/');
    form.parse(req, function(err, fields, files) {
        let oldPath = files.touxiang.path;
        let newPath = path.normalize(__dirname + '/../avatar/') + '/' + req.session.username +'.jpg';
        fs.rename(oldPath,newPath,function(err){
            if(err){
                res.send('失败');
                return;
            }
            /*缓存一下图片的地址*/
            req.session.avatar = req.session.username +'.jpg';
            /*头像上传成功，跳转到裁剪页面*/
            res.redirect('/cut');
        });
    });
}
/*显示裁剪页面*/
exports.showCut = function(req,res,next){
    res.render('cut',{
        'avatar': req.session.avatar
    });
}
/*执行裁剪*/
exports.doCut = function(req,res,next){
    /*这个页面接收几个GET请求参数*/
    /*w、h、x、y*/
    var filename = req.session.avatar;
    var w = req.query.w;
    var h = req.query.h;
    var x = req.query.x;
    var y = req.query.y;

    gm("./avatar/" + filename)
        .crop(w,h,x,y)
        .resize(100,100,"!")
        .write("./avatar/" + filename,function(err){
        if(err){
            console.log(err);
            res.send('-1');
            return;
        }
        /*更新数据库当前用户的avatar*/
        db.updateMany('users',{'username':req.session.username},{$set: {'avatar':req.session.avatar}},function(err,result){
                res.send("1");
        });
    });
}
/*发表说说*/
exports.doPost = function(req,res,next){
    /*必须保证登录状态*/
    if(req.session.login != '1'){
        res.send('非法闯入！此页面需要先登录');
        return;
    }
    /*得到用户的数据*/
    let form = new formidable.IncomingForm();
    let username = req.session.username;
    form.parse(req, function(err, fields, files) {
        /*得到表单之后做的事*/
        let content = fields.content;
        /*查询数据库中是否存在目标用户*/
        db.find('users',{'username':username},function(err,result){
            /*向数据库中保存说说*/
            db.insertOne('posts',{
                'username': username,
                'datetime': new Date(),
                'content': content
            },function(err,result){
                if(err){
                    /*数据库错误*/
                    res.send('-2');
                    return;
                }
                /*发表成功*/
                res.send('1');
            });
        });
    });
}
/*列出所有说说（分页）*/
exports.getAllShuoshuo = function(req,res,next){
    let page = req.query.page;
    db.find('posts',{},{'pageamount':6,'page':page,'sort':{'datetime':-1}},function(err,result){
        let obj = {'result':result};
        res.json(obj);
    });
}/*列出对应用户信息*/
exports.getUserInfo = function(req,res,next){
    let username = req.query.username;
    db.find('users',{'username':username},function(err,result){
        let obj = {
            'id':result[0]._id,
            'username':result[0].username,
            'avatar':result[0].avatar
            };
        res.json(obj);
    });
}
/*获取说说总数*/
exports.getPostsAmount = function(req,res,next){
    db.getAllCount('posts',function(amount){
        let postAmount = amount.toString();
        res.send(postAmount);
    });
}
/*获取对应用户说说*/
exports.showUserPosts = function(req,res,next){
    /*得到用户名（：号后面的参数通过req.params获取）*/
    let user = req.params.username;
    db.find('posts',{'username':user},function(err,result){
        db.find('users',{'username':user},function(err,result2){
            res.render('userPosts',{
                'login': req.session.login == '1' ? true : false,
                'username': req.session.login == '1' ? req.session.username : '',
                'active': '我的说说',
                'userPosts': result,
                'avatar': result2[0].avatar
            });
        });
    });
}
/*获取成员列表*/
exports.showUserList = function(req,res,next){
    db.find('users',{},function(err,result){
        res.render('userList',{
            'login': req.session.login == '1' ? true : false,
            'username': req.session.login == '1' ? req.session.username : '',
            'users': result,
            'active': '成员列表'
        });
    });
}

/*退出登录*/
exports.logOut = function(req, res,next){
    req.session.login = false;
    req.session.username = '';
    res.redirect('/');
}