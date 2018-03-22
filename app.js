let express = require('express');
let app = express();
/*引用路由*/
let router = require('./router/router.js');

/*引入session*/
let session = require('express-session');
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}))

/*模板引擎*/
app.set('view engine', 'ejs');

/*静态页面*/
app.use(express.static('./public'));
app.use('/avatar',express.static('./avatar'));

/*路由表*/
app.get('/',router.showIndex);
app.get('/register',router.showRegister);
app.post('/doRegister',router.doRegister);
app.get('/login',router.showLogin);
app.post('/doLogin',router.doLogin);
app.get('/upload',router.showUpload);
app.post('/doUpload',router.doUpload);
app.get('/cut',router.showCut);
app.get('/doCut',router.doCut);
/*发表说说*/
app.post('/post',router.doPost);
/*列出所有说说*/
app.get('/getAllShuoshuo',router.getAllShuoshuo);
/*获取用户对应信息*/
app.get('/getUserInfo',router.getUserInfo);
/*获取说说总数*/
app.get('/getPostsAmount',router.getPostsAmount);
/*获取对应用户说说*/
app.get('/user/:username',router.showUserPosts);
/*获取成员列表*/
app.get('/userList',router.showUserList);
/*退出登录*/
app.get('/logOut',router.logOut);

app.listen(3000);