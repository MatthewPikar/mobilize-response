"use strict";

var _ = require('lodash');

var status = {
    200:{
        code: 200,
        message:'OK'
    },
    201:{
        code: 201,
        message:'Created'
    },
    204:{
        code: 204,
        message:'No Content',
        description: 'Request was successful, but payload has no content.'
    },
    205:{
        code: 205,
        message:'Reset Content',
        description: 'Request was successful, user agent needs to reset the document view for updated content.'
    },
    206:{
        code: 206,
        message:'Partial Content',
        description: 'Request was successful in fulfilling the range request of the content.'
    },
    400:{
        code:400,
        message:'Bad Request',
        description:'Required argument is missing or an argument is of wrong type.'
    },
    401:{
        code:401,
        message:'Unathorized',
        description:'Required authorization credentials are missing or not valid.'
    },
    404:{
        code: 404,
        message: 'Not Found',
        description: "Resource does not exist."
    },
    405:{
        code: 405,
        message: 'Not Allowed',
        description: "The specified method is not allowed on this resource."
    },
    408:{
        code: 408,
        message: 'Request timeout',
        description: "The server timed out when trying to fulfill the request."
    },
    409:{
        code: 409,
        message: 'Conflict',
        description: "Resource already exists."
    },
    416:{
        code: 416,
        message: 'Range Not Satisfiable',
        description: "None of the ranges in the request's range field overlap the current extent of the selected resource or the set of ranges requested has been rejected due to invalid ranges or an excessive request of small or overlapping ranges."
    },
    500:{
        code: 500,
        message: 'Internal Server Error'
    },
    503:{
        code: 503,
        message: 'Service Unavailable',
        description: "the server is currently unable to handle the request due to a temporary overload or scheduled maintenance."
    }
};


// Response
// --------
// use:
// var Response = require('response');
// var response = new Response(args, callback)
//      args -  Contains any arguments you would like for created reponses to share.
//              Typically this will be something like {requestId: id}.  Any provided arguments
//              will override corresponding http fields.
//      callback - This is the function you would like the response to invoke.
//              Typically this will be a passthrough from the parent functions callback.
// Create response by calling make:
// response.make(code, args);
//      *code -  Correspond to the http status code which serves as the response wrapper.
//      args -  Contains any arguments you would like for created response to have in addition
//              to the http fields and arguments passed in the constructor.  Any provided
//              arguments will override corresponding http fields and constructor arguments.
//      returns - If callback was provided, it returns the response in the standard
//              callback(error, response) format.  Otherwise it returns the response collection.
// * - required argument
module.exports = function response(args, callback) {
    var self = this,
        template = (typeof(args) !== "undefined") ? args : {},
        clbk = (typeof(callback) !== "undefined") ? callback: false;

    self.make = function(code, args){
        if(!clbk){
            if (typeof(code) !== 'number') return new Error("Code is missing or not a number");
            if (typeof(status[code]) === 'undefined') return new Error("Provided code is invalid.");
        }
        else {
            if (typeof(code) !== 'number') return clbk(new Error("Code is missing or not a number"), null);
            if (typeof(status[code]) === 'undefined') return clbk(new Error("Provided code is invalid."), null);
        }

        var response = {status: status[code]};

        _.forEach(template, function(val, key){response[key] = val;});
        _.forEach(args, function(val, key){response[key] = val;});

        if(!clbk) return response;
        else return clbk(null, response);
    };
};