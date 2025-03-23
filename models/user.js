const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    username:({
        type:String,
    }),
    role:({
        type:String,
    }),
    email:({
        type:String,
    }),
    mobile:({
        type:String,
    }),
    domain:({
        type:String,
    }),
    password:({
        type:String,
    }),
    ischanged:({
        type:Boolean,
    })
})

const MyModel = mongoose.model('registrations', schema);
module.exports = MyModel

