"use strict";

var _ = require('lodash');
var fs = require('fs');
var bunyan = require('bunyan'),
    masterLog = bunyan.createLogger({
        name: 'mobilize',
        level: 'fatal',
        serializers: {response: responseSerializer}
    }),
    infoLog, errorLog, debugLog;

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

/*
    Response(callback, args, context)

    Creates and packages service responses into a standardized message format.  Serves
    as a centralized control for logging based on message content

    use:
    var Response = require('response');
    var response = new Response(args, callback);

    callback -  This is the function you would like the response to invoke upon finishing.
                It follows the standard function(err, response) format.
                Typically this will be a passthrough from the parent functions callback.
    args -  Contains any arguments you would like for all reponses to share.
            Typically this will be something like {requestId: id}.  Any provided arguments
            will override corresponding code wrapper content.
    context -   This is the context passed onto all  messages.  Context controls how messages
                are handled.  As an example, the 'api' context will strip most error information
                like the callstack and format status arguments into http format.
*/
module.exports = function response(options) {
    var self = this;

    self.options = _.extend({
        context: '',
        logPath: "logs/",
        debug: false,
        logInfo: false,
        logClientErrors: false,
        logInternalErrors: true,
        responseTemplate: {}
    }, options);

    // make sure logPath exists and is writable
    try {fs.accessSync(self.options.logPath, fs.W_OK)}
    catch(err){fs.mkdirSync(self.options.logPath);}

    // create logs
    infoLog = masterLog.child({
        widget_type: self.options.context,
        streams: [
            {
                name: 'file', level: 'info', type: 'rotating-file',
                path: self.options.logPath + 'info-' + self.options.context + ".log",
                period: '2d', count: 1
            }
        ]});
    errorLog = masterLog.child({
        widget_type: self.options.context,
        streams: [
            {
                name: 'file', level: 'error', type: 'rotating-file',
                path: self.options.logPath + 'error-' + self.options.context + ".log",
                period: '1w', count: 2
            },
            {name: 'stdout', level: 'error', stream: process.stdout}
        ]});
    debugLog = masterLog.child({
        widget_type: self.options.context,
        streams: [
            {
                name: 'debug', level: 'debug', type: 'rotating-file',
                path: self.options.logPath + 'debug-' + self.options.context + ".log",
                period: '4h', count: 0
            }
        ]});

    /*
     make(message, args)

     Creates a new message and forwards it to the callback (if provided).

     code - (required) Correspond to the http status code which serves as the response wrapper.
     args - Arguments of the message.  Any arguments clashing with code wrapper content
     will overwrite that part of the message.

     returns - new message
     */
    self.make = function (code, args, clbck) {
        if (typeof(code) !== 'number') {
            var err1 = new Error("Code is missing or not a number");
            clbk(err1, null);
            return err1;
        }
        if (typeof(status[code]) === 'undefined') {
            var err2 = new Error("Provided code is invalid.");
            clbk(err2, null);
            return err2;
        }
        clbck = (typeof(clbck) === "function") ? clbck : passthrough;

        var res = {};
        res = _.merge(res, self.options.responseTemplate);
        res = _.merge(res, {status: status[code]});
        res = _.merge(res, args);
        res = _.merge(res, {context: self.options.context});

        if ((res.status.code / 100 < 4)
            && self.options.logInfo)
            infoLog.info({response: res}, 'info');
        else if ((res.status.code / 100 >= 4) && (res.status.code / 100 < 5)
            && self.options.logClientErrors)
            infoLog.info({response: res}, 'A client error has occurred.');
        else if ((res.status.code / 100 >= 5)
            && self.options.logInternalErrors)
            errorLog.error({response: res}, 'An internal error has occurred.');

        if (self.options.debug) debugLog.debug({response: res}, 'debug');

        if (clbck) clbck(null, res);
        return res;
    };

    /*
     forward(message, args)

     Forwards the provided message to the callback (if provided).

     message - the message to forward
     args -  arguments to add onto the message.  Any arguments clashing with message content
     will overwrite that part of the message.

     returns - new message
     */
    self.forward = function (message, args, clbck) {
        clbck = (typeof(clbck) === "function") ? clbck : passthrough;

        var res = {};
        res = _.merge(res, self.options.responseTemplate);
        res = _.merge(res, message);
        res = _.merge(res, args);
        res = _.merge(res, {context: self.options.context});

        if ((res.status.code / 100 < 4)
            && self.options.logInfo)
                infoLog.info({response: res}, 'info');
        else if ((res.status.code / 100 >= 4) && (res.status.code / 100 < 5)
            && self.options.logClientErrors)
                infoLog.info({response: res}, 'A client error has occurred.');
        else if ((res.status.code / 100 >= 5)
            && self.options.logInternalErrors)
                errorLog.error({response: res}, 'An internal error has occurred.');

        if (self.options.debug) debugLog.debug({response: res}, 'debug');

        res.http$ = {
            status: res.status.code,
            headers: {
                'date': new Date().toUTCString(),
                'content-type': 'application/json'
            }
        };
        // don't forward details of internal errors
        if (res.error && (res.status.code / 100 >= 5)) delete res.error;
        // only forward simple status in http$ is forwarded
        delete res.status;

        if (clbck) clbck(null, res);
        return res;
    };
};

function responseSerializer(message){
    var res = [];

    if(Array.isArray(message.resources) && message.resources.length > 0) {
        for (var i = 0, len = message.resources.length; i < len; i++) {
            res[i] = {
                id: message.resources[i].id ? message.resources[i].id : 'empty',
                name: message.resources[i].name ? message.resources[i].name : 'empty'
            };
        }
    }

    return {
        req_id: message.requestId,
        status: message.status.code,
        latency: message.latency,
        res: res,
        req: message.request,
        err: message.error
    }}

function passthrough(err, res){return null;}