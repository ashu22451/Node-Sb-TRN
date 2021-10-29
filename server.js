import express from 'express'  
import bodyParser from 'body-parser';
import mongoClient from 'mongoose';
import {check, validationResult } from 'express-validator'
import bcrypt from 'bcrypt';
import * as mongo  from 'mongodb'

const app = express();
const salt = 10
const _id = mongo._id;

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
  confirmpassword :String, 
});


userSchema.pre('save',function(next){
    const user=this;
    
    if(user.isModified('password')){
        bcrypt.genSalt(salt,function(err,salt){
            if(err)return next(err);

            bcrypt.hash(user.password,salt,function(err,hash){
                if(err) return next(err);
                user.password=hash;
                user.confirmpassword=hash;
                next();
            })

        })
    }
    else{
        next();
    }
});

userSchema.methods.comparepassword=function(password,cb){
    bcrypt.compare(password,this.password,function(err,isMatch){
        if(err) return cb(next);
        cb(null,isMatch);
    });
}

const textUser = mongoClient.model('textUser',userSchema)

app.use(bodyParser.urlencoded({extended:false}))


app.get('/', (req, res)=>{
	res.send('home page')
})


app.post ('/user/registration',check("email","invalid email").isEmail(),
  check("password").isLength({ min:5}),
  check('confirmpassword').custom((value, { req }) => {
    if (req.body.confirmpassword !== req.body.password) {
      throw new Error('Both Passwords must be same');
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
  textUser.findOne({username:username},(err, example)=>{
    if (err)
        console.log(err);
    if (example){
        return res.status(200).json({errors:'Not available' });
        
    } else {
        const Example = new textUser (req.body);
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
    textUser.findOne({email:email},(err, token)=>{
        if(token){
            res.send({
                'access token': token._id,
            })
        } else {
            return res.status(500).json({errors:`Need to register first`})
        }
    })
});
var user = new textUser({
    _id
});

app.use("/user/get",(req, res, next)=>{
    let u = textUser.findOne({_id:_id})
    console.log(u)
    next();
})

app.get("/user/get", (req,res)=>{
    const{_id} = req.body;
    textUser.findOne({_id:_id},(err,snipe)=>{
        if (snipe){
            res.send({
                'info':snipe
            })
        } else {
            return res.status (500).json({errors:'No data found'})
        }
    });
})
app.use("/user/delete",(req, res, next)=>{
    let u = textUser.findOne({_id:_id})
    next();
})

app.put('/user/delete',(req, res)=>{
    const{_id} = req.body;
    textUser.findOneAndDelete({_id:_id},(err,wipe)=>{
        if(wipe){
        res.send({
            'Message':'User data deleted'
            })
    } else {
        return res.status(500).json({errors:'No data found'})
    }

    })
})

app.listen(3001,()=>{
	console.log('listened')
});

