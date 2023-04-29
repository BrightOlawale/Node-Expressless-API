// Description: Main file for the API

// Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const handlers = require("./lib/handlers");

// Creating instance of the HTTP Server
const httpServer = http.createServer(function(req, res){
    commonServer(req, res);
})

// Starting the HTTP Server 
httpServer.listen(config.httpPort, function(){
    console.log(`Server is currently listening on port ${config.httpPort} in ${config.env} environment`);
})

// Declaring the HTTPS server options
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}

// Creating instance of the HTTPS Server
const httpsServer = https.createServer(httpsServerOptions   , function(req, res){
    commonServer(req, res);
})

// Starting HTTPS server
httpsServer.listen(config.httpsPort, function(){
    console.log(`Server is currently listening on port ${config.httpsPort} in ${config.env} environment`);
})

// Handle routing
const router = {
    // "sample": handlers.sample
    "ping": handlers.ping
};


// Define common server logic
const commonServer = function(req, res){
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
        const selectHander = typeof(router[trimmedUrl]) !== 'undefined' ? router[trimmedUrl] : handlers.notFound; 

        // Construct the data object that should be sent to the handler
        const reqData = {
            'trimedUrl': trimmedUrl,
            'query': queryObject,
            'method': method,
            'headers': reqHeaders,
            'payload': buffer
        };

        // Route request to the selected handler
        selectHander(reqData, function(statusCode, payload){
            // Use statuscode called back by the selected handler or default to 200
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

            // Use the payload called back by the selected handler or default to {}
            payload = typeof(payload) === 'object' ? payload : {};

            // Convert payload to a string
            const stringedPayload = JSON.stringify(payload);

            // Return response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(stringedPayload);
            console.log('Returned these responses: ', statusCode, stringedPayload);

            // console.log(`Requested URL path ${trimmedUrl} and the method is ${method}\n`)
            // console.log("Request Query parameters: ", queryObject);
            // console.log("Request Header: \n", reqHeaders);
            // console.log("Here is the payload recieved: ", buffer);
        })

    }); // This event will always be called
};
