const express = require('express');
const bodyParser = require('body-parser');
const mongoClient = require('mongoose');
const {check, validationResult } = require('express-validator')
const mongo = require('mongodb')
const NodeRSA = require('node-rsa');
const mongoosePaginate = require('mongoose-paginate-v2')
const jwt = require('jsonwebtoken');
const JwtStrategy = require('passport-jwt').Strategy,
      ExtractJwt = require('passport-jwt').ExtractJwt
const passport = require('passport')
const nodemailer = require('nodemailer');
const async = require('async');



const app = express();
const key = new NodeRSA ({b:512});
key.setOptions({encryptionScheme: 'pkcs1'})
const _id = mongo._id;
app.use(bodyParser.urlencoded({extended:false}))
app.use(passport.initialize());


mongoClient.connect('mongodb://localhost:27017/testingdb',{
	useNewUrlParser:'true',
})
mongoClient.connection.on("error", err => {
    console.log("err", err)
})
mongoClient.connection.on("connected", (err, res) => {
    console.log("mongoose is connected")
})
var Schema = mongoClient.Schema
const addressSchema = Schema({
    
    street      : {type:String, required: true},
    city        : {type:String, required: true},
    state       : {type:String, required: true},
    pin_code    : {type:Number, required: true},
    phone_no    : {type:Number, required: true},
    user_id     : String,
    username    : [{type: Schema.Types.ObjectId,
    ref         : 'dataUser'}]  
                })

const userSchema = Schema({
	firstname  : {type:String, required: true},
	lastname   : {type:String, required: true},
	username   : {type:String, required: true, unique:true}, 
	email      : {type:String, required: true, unique:true}, 
	password   : {type:String, required: true, unique:true}, 
    Token      : String, 
    address    : [{type : Schema.Types.ObjectId,
    ref        : 'ADDRESS'}]
                });

const access_token = Schema({
    Access_Token: String,
    user_id     : String,
                    })

userSchema.plugin(mongoosePaginate)
const ADDRESS = mongoClient.model('ADDRESS',addressSchema)
const accesstoken = mongoClient.model('accesstoken',access_token) 
const dataUser = mongoClient.model('dataUser',userSchema)



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
  const firstname       = req.body.firstname;
  const lastname        = req.body.lastname;
  const username        = req.body.username;
  const password        = req.body.password;
  const confirmpassword = req.body.confirmpassword;
  const email           = req.body.email;
  

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
        
        const encryptPassword = key.encrypt(password,"base64");
        var token = jwt.sign({email:email},'secret',{expiresIn:3600})
        const Example = new dataUser ({
                        "firstname":`${req.body.firstname}`,
                        "lastname" :`${req.body.lastname}`,
                        "username" :`${req.body.username}`,
                        "password" :`${encryptPassword}`,
                        "email"    :`${req.body.email}`,
                        "Token"    :`${token}`
                    })
        Example.save(); 
        res.status(200).json({"message":"Registration complete",token:token, auth:true})
    }
  })
});

var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'secret';


console.log('yes')
passport.use(new JwtStrategy(opts, function(jwt_payload, done) {
    dataUser.findOne({email:jwt_payload.email}, function(err, user) {
        console.log(jwt_payload.email)
        if (err) { 
            return done(err, false);
        }
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }
    });  
 }));

// created for just checking authentication
app.get('/protected', passport.authenticate('jwt', {session:false}),(req,res)=>{
    
    res.status(200).send({success: true,})
})



app.post('/user/login', check('email','Invalid ').isEmail(),
check('password').isLength({min:5}) ,passport.authenticate('jwt', { session: false }),(req, res)=>{

    const email  = req.body.email;
    const password = req.body.password;
    

    const errors = validationResult(req)
    if (!errors.isEmpty() ){
        return res.status(400).json({errors:errors.array() });    
    };
    
    dataUser.findOne({email:email},(err, token, )=>{
        if(token){
            const userID = token._id
            var Tokens = jwt.sign({email:email},'secret', {expiresIn:3600});
            res.send({
                'access Token': Tokens,
                'user_id'     : token._id,
                success       : true
                    })
            const Example2 = new accesstoken({
                "Access_Token":`${Tokens}`,
                "user_id"     :`${userID}`
                             })
            Example2.save();

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
    next();
})

app.get("/user/get", (req,res)=>{
    const{_id} = req.body;
    dataUser.findOne({_id:_id}).populate().exec((err,usr)=>{
        if (usr){
            console.log(usr)
            console.log(usr._id)
            let user_id = usr._id
            ADDRESS.findOne({user_id:user_id}).exec((err,foo)=>{
                if (err) {return console.error(err); }
            res.send({'info':usr, 'address':foo})
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

app.get('/user/list/', async (req, res, next)=>{
    dataUser.paginate({},{page:req.query.page, limit:10})
    .then(response=>{
        res.json({
            response
        })
    }) .catch(error=>{
        res.status(400).json({
            error
        })
    }) 

 });

app.post('/user/address', (req, res)=>{
    
    const Authorization = req.headers
    console.log(Authorization)
    accesstoken.findOne({Authorization:Authorization},(err,id)=>{
        if (id){
          const USER_id = id.user_id
          console.log('User_id--',USER_id)
            const pin_code= req.body.pin_code;
            const phone_no= req.body.phone_no;
            const street  = req.body.street;
            const state   = req.body.state;
            const city    = req.body.city;
            

            const Example3 = new ADDRESS({
                    "pin_code":`${pin_code}`,
                    "phone_no":`${phone_no}`,
                    "street"  :`${street}`,
                    "state"   :`${state}`,
                    "city"    :`${city}`,
                    "user_id" :`${USER_id}`,
                    "user"    :`${user._id}`
                    
                            })
            Example3.save();
            res.send({street, city, state, pin_code, phone_no, USER_id})
        } else {
            ('err')
        }
    })
})

// const signUp = async(data)=>{
//     let user = await dataUser.findOne({email:data.email});
//     if (user) {
//         throw new Error("email already exist");
//     }

//    var user = new dataUser(data);
// }

app.post('/reset',(req, res)=>{
    const email = req.body.email 
    dataUser.findOne({email:email},(err,fine)=>{
        console.log(fine.email)
        if(fine){
            res.send({'email':fine})
        } else{
            res.status(200).json({'message':'none'})
        }

    })
})

app.listen(3001,()=>{
	console.log('listened')
});

