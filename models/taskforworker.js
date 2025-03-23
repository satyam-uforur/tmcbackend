const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
    taskid:({
        type:mongoose.Types.ObjectId
        // type:String,
    }),
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
    duedate:({
        type:String,
        // unique:true,
    }),
    status:({
        type:String,
        // unique:true,
    }),
    priority: ({
        type: String,
    }),
    detail:({
        type: String,
        // unique:true,
    }),
    workers:[{ type: String, required: true }],

    workerStatuses: [{
        worker: {
            type: String,
            required: true
        },
        status: {
            type: String,
            required: true
        }
    }],
    
    actionStatuses: [{
        worker: {
            type: String,
        },
        actions: {
            type: String,
        },
        date: {
            type: String,
        },
        msg: {
            type: String,
        }
    }]
})

const MyModel = mongoose.model('taskforworker', schema);
module.exports = MyModel

