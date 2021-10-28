  
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const mongoClient = require('mongoose');
const {check, validationResult,loginValidation, } = require('express-validator')
const bcrypt = require('bcrypt');
const salt = 10

//const _id =  ObjectId();
//const {mongoClien, ObjectId } = require('mongodb')
 const _id = require('mongodb')

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


//console.log(textUser)

app.use(bodyParser.urlencoded({extended:false}))


app.get('/', (req, res)=>{
	res.send('home page')
})


app.post ('/user/registration',check("email","invalid email").isEmail(),
  check("password").isLength({ min:5}),
  check('confirmpassword').custom((value, { req }) => {
    if (req.body.confirmpassword !== req.body.password) {
      throw new Error('password must be same');
    };
    return true;
  }),
  (req, res) =>{
  const firstamne = req.body.firstname;
  const lastname = req.body.lastname;
  const username = req.body.username;
  const password = req.body.password;
  const confirmpassword = req.body.confirmpassword;
  const email = req.body.email;
  const name = req.body.username;
  
   
  



  const errors = validationResult(req)
  if (!errors.isEmpty() ){
    return res.status(200).json({errors:errors.array() });
  };
  textUser.findOne({username:name},(err, example)=>{
    if (err)
        console.log(err);
    if (example){
        return res.status(200).json({errors:'already Exist' });
        console.log("this has in it");
    } else {
        const Example = new textUser (req.body);
        Example.save(); 
        
        res.send('/registration');
    }
  })
});

// const lastname = 4


app.post('/user/login', check('email','invalid email').isEmail(),
check('password').isLength({min:5}) ,(req, res)=>{

    const email  = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req)
    if (!errors.isEmpty() ){
        return res.status(400).json({errors:errors.array() });    
    };
    textUser.findOne({email:email},(err, map)=>{
        console.log(map._id)

        var token = map._id;
        console.log(token,'dsgsdgfg')
        var accessToken = (token, err) =>{
            if (token){
                console.log(token)
            } else {
                console.log(err)
            }

        }
        //console.log(map)   {to get whole about save object}
        if(map){
            res.send({
                
                'access token': map._id,
            })
        } else {
            return res.status(500).json({errors:'none'})
        }
    })
});

//console.log(token)
const validateToken = (req, res, next)=>{
    console.log('what?')
    
    next()
}



// app.get("/user/get", (req,res)=>{






//     res.send('/')
// })

app.listen(3001,()=>{
	console.log('listened')
});

