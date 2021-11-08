import express from 'express'  
import bodyParser from 'body-parser';
import mongoClient from 'mongoose';
import {check, validationResult } from 'express-validator'
import * as mongo  from 'mongodb';
import NodeRSA from 'node-rsa';
import mongoosePaginate from 'mongoose-paginate-v2';
        


const app = express();
const key = new NodeRSA ({b:512});
key.setOptions({encryptionScheme: 'pkcs1'})
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
	firstname  : String,
	lastname   : String,
	username   : String, 
	email      : String, 
	password   : String,  
    adress     : [{
        type   : mongoClient.Schema.Types.ObjectId,
        ref    : 'ADDRESS'
                }]
                    });

const access_token = new mongoClient.Schema({
    Access_Token: String,
    user_id     : String,
                    })

const address = new mongoClient.Schema({
    address     : String,
    city        : String,
    state       : String,
    pin_code    : String,
    phone_no    : String,
    user_id     : String,  
    username    :[{
         type   : mongoClient.Schema.Types.ObjectId,
         ref    : 'dataUser' 
                    }]
                    })
userSchema.plugin(mongoosePaginate)
const ADDRESS = mongoClient.model('ADDRESS',address)
const accesstoken = mongoClient.model('accesstoken',access_token) 
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
        
        const Example = new dataUser ({
                        "firstname":`${req.body.firstname}`,
                        "lastname" :`${req.body.lastname}`,
                        "username" :`${req.body.username}`,
                        "password" :`${encryptPassword}`,
                        "email"    :`${req.body.email}`
                    })
        Example.save(); 
        res.status(200).json({"message":"Registration complete"})
    }
  })
});

app.post('/user/login', check('email','Invalid ').isEmail(),
check('password').isLength({min:5}) ,(req, res)=>{

    const email  = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req)
    if (!errors.isEmpty() ){
        return res.status(400).json({errors:errors.array() });    
    };
    
    dataUser.findOne({email:email},(err, token, )=>{
        if(token){
            const userID = token._id
            const RandomNumber = Math.random()
            console.log(RandomNumber)
            //var Tokens = RandomNumber.sign({email:email}, {expiresIn:'1h'});
            res.send({
                'access Token': RandomNumber
                    })
            const Example2 = new accesstoken({
                "Access_Token":`${RandomNumber}`,
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
            const address = req.body.address;
            const state   = req.body.state;
            const city    = req.body.city;
            

            const Example3 = new ADDRESS({
                    "pin_code":`${pin_code}`,
                    "phone_no":`${phone_no}`,
                    "address" :`${address}`,
                    "state"   :`${state}`,
                    "city"    :`${city}`,
                    "user_id" :`${USER_id}`,
                    
                            })
            Example3.save();
            res.send({address, city, state, pin_code, phone_no, USER_id})
        } else {
            ('err')
        }
    })
})

app.get('/user/get/:_id',(req, res)=>{
    const _id = req.params
    dataUser.findOne({_id:_id}).populate('adress').exec((err,user) =>{
        if (err){return console.error(err);}
        console.log(user)
        console.log(populate())
    })
});

app.listen(3001,()=>{
	console.log('listened')
});

