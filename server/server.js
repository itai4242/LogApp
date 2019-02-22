require('./config/config');

const path = require ('path');
const express = require('express');
const bodyParser = require('body-parser');
var {mongoose} = require('./db/mongoose');
var {User} = require('./models/user');
var {authenticate} = require('./middleware/authenticate');
var fs = require('fs');
const bcrypt = require('bcryptjs');

var app = express();
const port = process.env.PORT;

const publicPath = path.join(__dirname, '../views')
var archive = []
app.use(bodyParser.json());
app.use(express.static(publicPath));
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/sign.html', async (req, res) => {
  try {
    if (req.body.password!==req.body.password2){
      res.send('not the same passwords');
    } else{
        const body = {username:req.body.username,password:req.body.password};
        const user = new User(body);
        var there = await User.findOne({username:user.username});
        if (there) {
          res.send('already there');
        }else{
          await user.save();
          res.send('signed successfully');
        }
    }
    }catch (e) {
      res.status(400).send(e);
    }
})
app.post('/', async (req,res) =>{
  try {
    // const body = _.pick(req.body, ['email', 'password']);
    const user = await User.findByCredentials(req.body.username, req.body.password)
    const token = await user.generateAuthToken()
    archive.push(req.body.password);
 
    // res.header('x-auth', token).send('logged in');
    const text = path.join(__dirname, 'baseLog.txt')
    fs.readFile(text, 'utf-8', function(err, data){
      if (err) throw err;
  
      var newValue = data.replace('token', `${token}`);
      const change = path.join(__dirname, 'serverApp.txt')
      fs.writeFile(change, newValue, 'utf-8', function (err) {
        if (err) throw err;
      });
    });  
    res.header('x-auth', token).send(token);
  } catch (e) {
      res.send('check if name or password is right');
  }
});
// app.post('/logged', async (req,res)=>{
//   const user = await User.findByCredentials(req.body.username, req.body.password)
//   res.send(user.tokens[0].token)
// })
app.delete('/logged.html', authenticate ,async (req,res)=>{
  try {
    const user = await User.findByToken(req.token)
    console.log('hi')
    archive = archive.filter(async (password)=> {
       bcrypt.compare(password, user.password).then(()=> false).catch(true)
      //   if (res) {
      //     return false;
      //   } else {
      //     return true;
      //   }
      // });
    })
    await req.user.removeToken(req.token)
    res.send('remove token');
  } catch (e) {
    res.send('something went wrong');
  }
})
app.post('/logged.html', authenticate, async(req,res)=>{
  try{
    const user = await User.findOne({username:req.user.username})
    const password = archive.find((password)=> bcrypt.compare(password, user.password).then(()=> true).catch(false))
    console.log(archive)
    res.send({
      username:user.username,
      password,
      logs:user.logs
    })
  }catch (e) {
    res.status(201).send('something went wrong');
  }

})

app.get('/serverApp',(req,res) => {
  // fs.readFile('serverApp.txt', 'utf-8', function(err, data){
  //   if (err) throw err;

  //   var newValue = data.replace('token', `${req.token}`);

  //   fs.writeFile('serverApp.txt', newValue, 'utf-8', function (err) {
  //     if (err) throw err;
  //   });
  // });
  const download = path.join(__dirname, 'serverApp.txt')
  // res.download('/serverApp',download)
  res.download(download,'/serverApp')
})
app.post('/anywhere',authenticate, async(req,res) => {
  try{
    const user = await User.findOne({username:req.user.username})
    // var logs = user.logs;
    // logs.push({title:req.body.title, text:req.body.text})
    user.logs =  user.logs.concat([{title:req.body.title, text:req.body.text}]);
    await user.save();
    // const upd = await User.findOneAndUpdate({username:user.username},{$set: logs}, {new: true})
    res.status(200).send()
  }catch (e) {
    res.status(400).send()
  }
})
app.listen(port, () => {
  console.log(`Started on port ${port}`);
});
