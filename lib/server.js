/*
 *  Description: Server file
 * 
 */


// Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("../configs");
const fs = require("fs");
const handlers = require("./handlers");
const helpers = require("./helpers");
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// General server container
const server = {};

// Creating instance of the HTTP Server
server.httpServer = http.createServer(function(req, res){
    server.commonServer(req, res);
})

// Declaring the HTTPS server options
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
}

// Creating instance of the HTTPS Server
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res){
    server.commonServer(req, res);
})

// Define common server logic
server.commonServer = function(req, res){
    const parsedUrl = url.parse(req.url, true); // To get the URL parsed
    
    // Get the path and trim it to remove the leading and trailing "/"
    const path = parsedUrl.pathname;
    const trimmedUrl = path.replace(/^\/+|\/+$/g,'');

    // Retrieve the request method
    const method = req.method.toUpperCase();

    // Retrieve the request query parameters as an object
    const queryObject = parsedUrl.query;

    // Retrieve the request headers
    const reqHeaders = req.headers;

    // Get the payload of the request if available
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', function(data){
        buffer += decoder.write(data);
    }); // On the event where there is a data to be read fom stream

    req.on('end', function(){
        buffer += decoder.end();
        // Identify request handler
        const selectHander = typeof(server.router[trimmedUrl]) !== 'undefined' ? server.router[trimmedUrl] : handlers.notFound; 

        // Construct the data object that should be sent to the handler
        const reqData = {
            'trimedUrl': trimmedUrl,
            'query': queryObject,
            'method': method,
            'headers': reqHeaders,
            'payload': helpers.jsonToObject(buffer)
        };

        // Route request to the selected handler
        selectHander(reqData, function(statusCode, payload, contentType){
            // Check or assign content Type
            contentType = typeof(contentType) === 'string' ? contentType : 'json';

            // Use statuscode called back by the selected handler or default to 200
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
            let stringedPayload = '';
            const contentObject = {
                'html': 'text/html',
                'favicon': 'image/x-icon',
                'css': 'text/css',
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'plain': 'text/plain'
            }

            if (contentType === 'json'){
                res.setHeader('Content-Type', 'application/json');
                // Use the payload called back by the selected handler or default to {}
                payload = typeof(payload) === 'object' ? payload : {};
                // Convert payload to a string
                stringedPayload = JSON.stringify(payload);
            }
            
            if (contentType in contentObject){
                res.setHeader('Content-Type', contentObject[contentType]);
                // Use the payload called back by the selected handler or default to empty string
                stringedPayload = typeof(payload) === 'string' ? payload : ''
            }

            // Return response
            res.writeHead(statusCode);
            res.end(stringedPayload);

            if (statusCode === 200){
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+'/'+trimmedUrl+'/'+statusCode)
            } else{
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+'/'+trimmedUrl+'/'+statusCode)
            }

            // debug(`Requested URL path ${trimmedUrl} and the method is ${method}\n`)
            // debug("Request Query parameters: ", queryObject);
            // debug("Request Header: \n", reqHeaders);
            // debug("Here is the payload recieved: ", buffer);
        })

    }); // This event will always be called
};

// Handle routing
server.router = {
    "ping": handlers.ping,
    "api/users": handlers.users,
    "api/tokens": handlers.tokens,
    "api/checks": handlers.checks,
    "": handlers.index,
    "account/create": handlers.createAccount,
    "account/update": handlers.updateAccount,
    "account/delete": handlers.deleteAccount,
    "session/create": handlers.createSession,
    "session/delete": handlers.deleteSession,
    "checks/create": handlers.createChecks,
    "checks/update": handlers.updateChecks,
    "checks/all": handlers.viewChecks
};

// Server Initialization function
server.init = function(){
    // Starting the HTTP Server 
    server.httpServer.listen(config.httpPort, function(){
        console.log('\x1b[35m%s\x1b[0m', `Server is currently listening on port ${config.httpPort} in ${config.env} environment`);
    })

    // Starting HTTPS server
    server.httpsServer.listen(config.httpsPort, function(){
        console.log('\x1b[36m%s\x1b[0m', `Server is currently listening on port ${config.httpsPort} in ${config.env} environment`);
    })
}

// Export the container
module.exports = server;