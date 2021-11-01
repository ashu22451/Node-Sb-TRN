import express from 'express'  
import bodyParser from 'body-parser';
import mongoClient from 'mongoose';
import {check, validationResult } from 'express-validator'
import * as mongo  from 'mongodb'
import NodeRSA from 'node-rsa'



const app = express();
const key = new NodeRSA ({b:512});
const _id = mongo._id;


const text = 'sayo nara RSA!'
const encrypted = key.encrypt(text,'base64');
console.log('Encrypted text-',encrypted);

const decrpyted = key.decrypt(encrypted,'utf8');
console.log('decrpyted text:',decrpyted)

mongoClient.connect('mongodb://localhost:27017/Serverdb',{
	useNewUrlParser:'true',
})
mongoClient.connection.on("error", err => {
    console.log("err", err)
})
mongoClient.connection.on("connected", (err, res) => {
    console.log("mongoose is connected")
})


const userSchema = new mongoClient.Schema({
	firstname: String,
	lastname : String,
	username : String, 
	email    : String, 
	password : String, 
});


const dataUser = mongoClient.model('dataUser',userSchema)

app.use(bodyParser.urlencoded({extended:false}))

app.get('/', (req, res)=>{
	res.send('home page')
})


app.post ('/user/registration',check("email","invalid email").isEmail(),
  check("password").isLength({ min:5}),
  check('confirmpassword').custom((value, { req }) => {
    if (req.body.confirmpassword !== req.body.password) {
      throw new Error('Passwords must be same');
    };
    return true;
  }),
  (req, res) =>{
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const username = req.body.username;
  const password = req.body.password;
  const confirmpassword = req.body.confirmpassword;
  const email = req.body.email;
  

  const errors = validationResult(req)
  if (!errors.isEmpty() ){
    return res.status(200).json({errors:errors.array() });
  };
  dataUser.findOne({username:username},(err, example)=>{
    if (err)
        console.log(err);
    if (example){
        return res.status(200).json({errors:'Not available' });
        
    } else {
        console.log(password)
        const encryptPassword = key.encrypt(password,"base64");
        console.log('Encrypted Password-',encryptPassword)
        const decryptPassword = key.decrypt(encryptPassword,'utf8');
        console.log('Decrpyted Password-',decryptPassword)
        const Example = new dataUser ({
                        "firstname":`${req.body.firstname}`,
                        "lastname":`${req.body.lastname}`,
                        "username":`${req.body.username}`,
                        "password":`${encryptPassword}`,
                        "email":`${req.body.email}`
                    })
        Example.save(); 
        res.status(200).json({"message":"Registration complete"})
    }
  })
});


app.post('/user/login', check('email','Invalid mailId').isEmail(),
check('password').isLength({min:5}) ,(req, res)=>{

    const email  = req.body.email;
    const password = req.body.password;


    const errors = validationResult(req)
    if (!errors.isEmpty() ){
        return res.status(400).json({errors:errors.array() });    
    };
    
    dataUser.findOne({email:email},(err, token, )=>{
        console.log(token)
        dataUser.findOne({email:email},(err, pass)=>{
        console.log('Password:',pass.password);
        const password = pass.password
        console.log('*********----',password)
        const decryptPassword = key.decrypt(password,'utf8')
        console.log('Decrypt Password-',decryptPassword)
        })
        if(token){
            res.send({
                'access token': token._id,
            })
        } else {
            return res.status(500).json({errors:`Invalid Credentials`})
        }
    })
});
var user = new dataUser({
    _id
});

app.use("/user/get",(req, res, next)=>{
    let u = dataUser.findOne({_id:_id})
    console.log(u)
    next();
})

app.get("/user/get", (req,res)=>{
    const{_id} = req.body;
    dataUser.findOne({_id:_id},(err,snipe)=>{
        if (snipe){
            console.log(snipe.password)
            res.send({
                'info':snipe
            })
        } else {
            return res.status (500).json({errors:'No data found'})
        }
    });
})
app.use("/user/delete",(req, res, next)=>{
    let u = dataUser.findOne({_id:_id})
    next();
})

app.put('/user/delete',(req, res)=>{
    const{_id} = req.body;
    dataUser.findOneAndDelete({_id:_id},(err,wipe)=>{
        if(wipe){
        res.send({
            'Message':'Data deleted'
            })
    } else {
        return res.status(500).json({errors:'No data found'})
    }

    })
})

app.listen(3001,()=>{
    // console to check 
	console.log('listened')

});

