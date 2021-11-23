const express = require('express');
const fs = require('fs');
const mongoClient = require('mongoose')
const mongo = require('mongodb')

const app = express()


mongoClient.connect('mongodb://localhost:27017/Serverdb',{
  useNewUrlParser:'true',
})
mongoClient.connection.on("error", err => {
    console.log("err", err)
})
mongoClient.connection.on("connected", (err, res) => {
    console.log("mongoose is connected")
})
var Schema = mongoClient.Schema

const imgSchema = Schema({
  image: {data: Buffer, contentType: String}
});

const Image = mongoClient.model('Image',imgSchema)


app.get ('/', (req, res, next)=>{
  Image.findById(a,(err,doc)=>{
    if (err)return next(err);
    res.contentType(doc.image.contentType);
    res.send(doc.image.data) 
  });
});

//img path 
let imagePath = '/home/bhoots/Downloads/AJ.jpeg';

const a = new Image;
a.image.data = fs.readFileSync(imagePath);
a.image.contentType = 'image/jpeg'
a.save(function (err, a){
  if (err) throw err;
  console.error('saved img to db')
})

app.listen (3002,()=>{
  console.log('created')
})