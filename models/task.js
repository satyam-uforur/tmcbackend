const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    name:({
        type:String,
    }),
    task:({
        type:String,
    }),
    assigndate:({
        type:String,
        // unique:true,
    }),
    detail:({
        type: String,
        // unique:true,
    }),
    duedate:({
        type:String,
        // unique:true,
    }),
    description:({
        type:String,
        // unique:true,
    }),
    role:({
        type:String,
        // unique:true,
    }),
    priority:({
        type:String,
        // unique:true,
    }),
    taskassigner:({
        type:String,
        // unique:true,
    }),
    mainstatus:({
        type:String,
        // unique:true,
    }),
    manageraction:({
        type:String,
        // unique:true,
    }),
    managerdeclinemsg:({
        type:String,
        // unique:true,
    }),
    declinedate: ({
        type: String,
        // unique:true,
    }),
})

const MyModel = mongoose.model('task', schema);
module.exports = MyModel

