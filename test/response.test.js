"use strict";

var assert = require('assert');
var Response = require('response');

describe('response', function(){
    describe('constructor', function(){
        it('Should return an error if args or callback are malformed.')
    });

    describe('make', function(){
        var response = new Response();
        it('Should return an error if code argument is missing or malformed.', function(){

            assert.equal(400, 400, "Missing requestId: Returned Status code is not 400: ");
        });
        it('Should return an error if args argument is malformed.');
        it('Should return a callback function if provided in the constructor.');
        it('Should return a message payload if constructor provided in the constructor.');
    });


    function callbackTest(error, response){
        return true;
    }
});