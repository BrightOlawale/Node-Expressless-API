/*
 *Description: Request handlers defined here
* 
*/


// Dependencies
const config = require("../configs");
const Data = require("./dataLogic");
const helpers = require("./helpers");

// Define handlers
const handlers = {};

/*
 * JSON API HANDLERS DEFINED HERE
 * 
 */

// Sample handler
// handlers.sample = function(data, callback){
//     callback(206, {'name': 'Sample handler'});
// };

// Ping handler: To check if server is Up
handlers.ping = function(data, callback){
    callback(206, {'status': 'Server is up'})
};

// Defining the handler._users functions NOW
handlers._users = {};

// Users handler: First check the method being called by ther users route then pick the right handler for the route
handlers.users = function(data, callback){
    const applicableMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (applicableMethods.indexOf(data.method) === -1){
        callback(405);
    }  else{
        handlers._users[data.method](data, callback);
    }
};

// Users POST method
// WHERE required data: firstname, lastname, phone, password, tosAgreement AND optional data: none
handlers._users.POST = function(data, callback){
    // Checking if required filled are correctly provided
    const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = (typeof(data.payload.phone) === 'string') && ((data.payload.phone.trim().length > 0) && (data.payload.phone.trim().length <=15)) ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false;

    if (!firstName || !lastName || !phone || !password || !tosAgreement){
        callback(400, {'Error': 'Payload missing some required fields'});
    } else{
        // We are going to be storing each user's data in a file named after their phone number E.g: 08174555662.json
        // So we can verify if a user exist by checking if their phone number is already named as a file in our data folder by trying to read a file named after thier phone
        // If user already exist, we should get an error.
        Data.read('users', phone, function(err, data){
            if (err){
                // First, let's hash the password
                const hashedPassword = helpers.hash(password);

                if (!hashedPassword) {
                    callback(400, {'Error': "Couldn't hash the password"});
                } else{
                    // Then, we create the user data in an object
                    const userData = {
                        'firstName':  firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'password': hashedPassword,
                        'tosAgreement': tosAgreement
                    }
                    
                    // Now we create the new user
                    Data.create('users', phone, userData, function(err){
                        if (err) {
                            console.error(err);
                            callback(500, {'Error': "Couldn't create new user"});
                        } else{
                            // If successful
                            callback(200);
                        }
                    }) 
                }          
            } else {
                callback(400, {'Error': 'User already exists'});
            }
        })
        }
};

// Users GET method
// Required data: phone
handlers._users.GET = function(data, callback){
    // Verify phone
    const phone = typeof(data.query.phone) === 'string' && (data.query.phone.trim().length > 0 && data.query.phone.trim().length <=15) ? data.query.phone.trim() : false;

    if(phone){
        // Get token from the header
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        if (token){
            handlers._tokens.authToken(token, phone, function(tokenIsValid){
                if(tokenIsValid){
                    // If token is valid is correctly verified read the data
                    Data.read('users', phone, function(err, data){
                        if(!err && data){
                            // Remove the hash password from the data object
                            delete data.password;
                            callback(200, data);
                        } else{
                            callback(404); // Data not found
                        }
                    })
                } else{
                    callback(403, {'Error': 'Token is invalid'});
                }
            })
        } else{
            callback(403, {'Error': 'Token is missing in the request header'})
        }
    } else {
        callback(400, {'Error': 'Missing required field'});
    }
};

// Users put method
// Required data: phone
// Optional data: firstName, lastName, password
handlers._users.PUT = function(data, callback){
    // Verify the phone
    const phone = (typeof(data.payload.phone) === 'string') && ((data.payload.phone.trim().length > 0) && (data.payload.phone.trim().length <=15)) ? data.payload.phone.trim() : false;

    if(phone){
        // Verify the inputed data
        const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
        const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
        const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

        if (firstName || lastName || password){
            // Retrieve the token from header
            const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

            if (token){
                handlers._tokens.authToken(token, phone, function(tokenIsValid){
                    if (tokenIsValid){
                        // Look up the user
                        Data.read('users', phone, function(err, data){
                            if (!err && data){
                                if (firstName){
                                    data.firstName = firstName;
                                }
                                if (lastName){
                                    data.lastName = lastName;
                                }
                                if (password){
                                    data.password = helpers.hash(password);
                                }
            
                                // Now, we update our record
                                Data.update('users', phone, data, function(err){
                                    if (err){
                                        console.error(err);
                                        callback(500, {'Error': 'Couuld not update user details'});
                                    } else{
                                        callback(200);
                                    }
                                })
                            } else{
                                callback(400, {'Error': 'User does not exist'})
                            }
                        });
                    } else{
                        callback(403, {'Error': 'Token is invalid'});
                    }
                })
            } else{
                callback(403, {'Error': 'Token is missing in the request header'});
            }
        } else{
            callback(400, {'Error': 'Missing fields to update'});
        }
    } else{
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Users delete method
// Required data: phone
handlers._users.DELETE = function(data, callback){
    // Verify if phone is valid
    const phone = typeof(data.query.phone) === 'string' && ((data.query.phone.trim().length > 0) && (data.query.phone.trim().length <=15)) ? data.query.phone.trim() : false;

    if (phone){
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        if (token){
            // Verify token
            handlers._tokens.authToken(token, phone, function(tokenIsValid){
                if(tokenIsValid){
                    // Check if phone is in our record
                    Data.read('users', phone, function(err, data){
                        if (!err && data){
                            Data.delete('users', phone, function(err){
                                if(!err){
                                    // Clean-up checks attached
                                    const userChecks = typeof(data.checks) === 'object' && data.checks instanceof Array ? data.checks : [];
                                    const noOfChecks = userChecks.length;

                                    if (noOfChecks > 0){
                                        let noOfChecksDeleted = 0;
                                        let deletionErrorOccured = false;
                                        userChecks.forEach((checkID) => {
                                            Data.delete('checks', checkID, function(err){
                                                if (err){
                                                    deletionErrorOccured = true;
                                                }
                                                noOfChecksDeleted++;
                                                if(noOfChecksDeleted === noOfChecks){
                                                    if (deletionErrorOccured){
                                                        callback(500, {'Error': 'Error occured while deleting checks, some checks were not deleted'});
                                                    } else{
                                                        callback(200)
                                                    }
                                                }
                                            })
                                        });
                                    } else{
                                        callback(200);
                                    }
                                } else{
                                    callback(500, {'Error': 'Could not delete user'});
                                }
                            })
                        } else{
                            callback(404, {'Error': 'User does not exist'});
                        }
                    })
                } else{
                    callback(403, {'Error': 'Token is invalid'})
                }
            })
        } else{
            callback(403, {'Error': 'Token is missing from the request header'});
        }
    } else{
        callback(400, {'Error': 'Missing required field'});
    }
};

// Defining container for handlers._tokens
handlers._tokens = {};

// Token handler
handlers.tokens = function(data, callback){
    const applicableMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (applicableMethods.indexOf(data.method) === -1){
        callback(405);
    }
    handlers._tokens[data.method](data, callback);
};

// Tokens POST method
// WHERE required data: phone, password AND optional data: none
handlers._tokens.POST = function(data, callback){
    const phone = (typeof(data.payload.phone) === 'string') && ((data.payload.phone.trim().length > 0) && (data.payload.phone.trim().length <=15)) ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password){
        //  Verify user exists
        Data.read('users', phone, function(err, data){
            if (!err && data){
                const hashedPassword = helpers.hash(password);

                if (hashedPassword === data.password) {
                    const tokenId = helpers.randomToken(30);
                    const expiresIn = Date.now() + (1000 * 60 * 60);

                    // Create the Token Object
                    const tokenObject = {
                        'phone': phone,
                        'tokenId': tokenId,
                        'expiresIn': expiresIn
                    }

                    // Now, we store the token in our record
                    Data.create('tokens', tokenId, tokenObject, function(err){
                        if(!err){
                            callback(200, tokenObject);
                        } else{
                            callback(500, {'Error': 'Could not create token'})
                        }
                    })
                } else{
                    callback(400, {'Error': 'Phone or Password incorrect'})
                }
            } else{
                callback(400, {'Error': 'User not found'})
            }
        })
    } else{
        callback(400, {'Error': 'Missing required fields'});
    }
};

//  Token GET method
handlers._tokens.GET = function(data, callback){
    const tokenId = (typeof(data.query.id) === 'string' && data.query.id.trim().length === 30) ? data.query.id.trim() : false;

    if (tokenId){
        Data.read('tokens', tokenId, function(err, data){
            if (!err && data){
                callback(200, data);
            } else{
                callback(400,)
            }
        })
    } else{
        callback(400, {'Error': 'invalid token id'});
    }
}

// Token PUT method
// WHERE Required data: id and extend(Boolean value)
handlers._tokens.PUT = function(data, callback){
    // Verify input data
    const tokenId = typeof(data.payload.tokenId) === 'string' && data.payload.tokenId.trim().length === 30 ? data.payload.tokenId.trim() : false;
    const extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false;

    // Continue if veriied
    if (tokenId && extend){
        // Verify if token even exists
        Data.read('tokens', tokenId, function(err, data){
            if (!err && data){
                // We need to check if the token hasn't expired
                if (data.expiresIn > Date.now()){
                    // Not expired, extend expiry time
                    data. expiresIn = Date.now() + (1000 * 60 *60);

                    // Store the new value
                    Data.update('tokens', tokenId, data, function(err){
                        if (!err){
                            callback(200,);
                        } else{
                            callback(500, {'Error': 'Could not update Token'});
                        }
                    })
                } else{
                    callback(400, {'Error': 'Token has already expired'});
                }
            } else{
                callback(400, {'Errror': 'Token does not exist'});
            }
        })
    } else{
        callback(400, {'Error': 'Missing required fields'});
    }
};

// Token DELETE method
// WHERE Required data: id
handlers._tokens.DELETE = function(data, callback){
    // Verify id
    const tokenId = typeof(data.query.id) === 'string' && data.query.id.trim().length === 30 ? data.query.id.trim() : false;

    // If id is valid continue 
    if (tokenId){
        // We check if token actually exist
        Data.read('tokens', tokenId, function(err, data){
            if (!err && data){
                // Now we go ahead and delete the token
                Data.delete('tokens', tokenId, function(err){
                    if (!err){
                        callback(200);
                    } else{
                        callback(500, {'Error': 'Could not delete Token'});
                    }
                })
            } else{
                callback(400, {'Error': 'Invalid Token'})
            }
        })
    } else {
        callback(400, {'Error': 'Invalid Token'})
    }
};

// Handler for the check route
handlers.checks = function(data, callback){
    const applicableMethods = ["GET", "POST", "PUT", "DELETE"];

    if (applicableMethods.indexOf(data.method) != -1){
        handlers._checks[data.method](data, callback);
    } else{
        callback(405);
    }
}

// Handler _checks method containers
handlers._checks = {};

// POST method for the check route
// Required data: protocol, url, method, successCode, timeoutSeconds
handlers._checks.POST = function(data, callback){
    // Validate inputs
    const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) != -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) != -1 ? data.payload.method :false;
    const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds =  typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;
    
    if (protocol && url && method && successCodes && timeoutSeconds){
        // Retrieve the token
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        if (token){
            // Look up the token
            Data.read('tokens', token, function(err, tokenData){
                if (!err && tokenData){
                    // Confirm the phone number
                    const phoneNumber= tokenData.phone;

                    Data.read('users', phoneNumber, function(err, userData){
                        if (!err && userData){
                            const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];

                            // Confirm that the user number of check is less than the  maximum number of check per user
                            if (userChecks.length < config.maxChecks){
                                    // Create check ID
                                    const checkID = helpers.randomToken(20);

                                    // Create check object
                                    const checkObject = {
                                        'id': checkID,
                                        'phone': phoneNumber,
                                        'protocol': protocol,
                                        'url': url,
                                        'method': method,
                                        'successCode': successCodes,
                                        'timeoutSeconds': timeoutSeconds
                                    }

                                    // Save to our record
                                    Data.create('checks', checkID, checkObject, function(err){
                                        if (!err){
                                            // Add the checkID to the user record
                                            userData.checks = userChecks;
                                            userData.checks.push(checkID);

                                            // Update the user record
                                            Data.update('users', phoneNumber, userData, function(err){
                                                if (!err){
                                                    callback(200, checkObject);
                                                } else{
                                                    callback(500, {'Error': 'Could not update user data'});
                                                }
                                            })
                                        } else{
                                            callback(500, {'Error': 'Could not create check object'});
                                        }
                                    })
                            } else{
                                callback(400, {'Error': 'Exceeded number of checks: ('+config.maxChecks +'checks)'});
                            }
                        } else{
                            callback(403);
                        }
                    })
                } else{
                    callback(403)
                }
            })
        }  else{
            callback(403, {'Error': 'Token is missing'})
        }
    } else {
        callback(403);
    }
};

// Checks GET handler
// Required data: id
handlers._checks.GET = function(data, callback){
    // Verify Id validity
    const id = typeof(data.query.id) === 'string' && data.query.id.trim().length === 20 ? data.query.id : false;

    if (id){
        // Lookup check
        Data.read('checks', id, function(err, checkData){
            if (!err && checkData){
                // Verify token is available
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

                if (token){
                    // validate token
                    handlers._tokens.authToken(token, checkData.phone, function(tokenIsValid){
                        if (tokenIsValid){
                            callback(200, checkData);
                        } else{
                            callback(403, {'Error': 'Token parsed is not valid'});
                        }
                    })
                } else {
                    callback(403, {'Error': 'Missing token'});
                }        
            } else{
                callback(404, {'Error': 'Check not found'});
            }
        })
    } else{
        callback(400, {'Error': 'Missing required data'})
    }
};

// The checks PUT handler
// required data: id
// Optional data: url, protcol, method, successCodes, timeoutSeconds (Atleast one must be provided)
handlers._checks.PUT = function(data, callback){
    // Required data
    const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id : false;

    // Optional data
    const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) != -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method) != -1 ? data.payload.method :false;
    const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds =  typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (id){
        // Check if one of the optional data is available
        if (protocol || url || method || successCodes || timeoutSeconds){
            Data.read('checks', id, function(err, checkData){
                if (!err && checkData){
                    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                    if (token){
                        // Verify token
                        handlers._tokens.authToken(token, checkData.phone, function(tokenIsValid){
                            if (tokenIsValid){
                                // Update the optional data parsed
                                if (protocol) {
                                    checkData.protocol = protocol;
                                }
                                  
                                if (url) {
                                    checkData.url = url;
                                }
                                  
                                if (method) {
                                    checkData.method = method;
                                }
                                  
                                if (successCodes) {
                                    checkData.successCodes = successCodes;
                                }
                                  
                                if (timeoutSeconds) {
                                    checkData.timeoutSeconds = timeoutSeconds;
                                }
                                
                                // Update the record
                                Data.update('Checks', id, checkData, function(err){
                                    if (!err){
                                        callback(200);
                                    } else{
                                        callback(500, {'Error': 'Could not update the check'})
                                    }
                                })
                            } else{
                                callback(403, {'Error': 'Token parsed is invalid'});
                            }
                        })   
                    } else{
                        callback(403, {'Error': 'Token is missing'})
                    }
                } else{
                    callback(404, {'Error': 'Cannot find the check'})
                }
            })
        } else{
            callback(400, {'Error': 'Missing atleast one optional data to update'})
        }
    } else{
        callback(400, {'Error': 'Missing required field'})
    }
};

// The DELETE check handler
// Required data: id 
handlers._checks.DELETE = function(data, callback){
    // Verify id
    const id = typeof(data.query.id) === 'string' && data.query.id.trim().length === 20 ? data.query.id : false;

    if (id){
        // validate id
        Data.read('checks', id, function(err, checkData){
            if (!err && checkData){
                // Check token
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

                if (token){
                    // verify token
                    handlers._tokens.authToken(token, checkData.phone, function(tokenIsValid){
                        if (tokenIsValid){
                            // Delete check data
                            Data.delete('checks', id, function(err){
                                if (!err){
                                    // Remove every reference to the check
                                    Data.read('users', checkData.phone, function(err, userData){
                                        if (!err && userData){
                                            // Delete the check array
                                            const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
                                            const position = userChecks.indexOf(id);

                                            if (position != -1){
                                                userChecks.splice(position, 1);

                                                // Update User record
                                                Data.update('users', checkData.phone, userData, function(err){
                                                    if (!err){
                                                        callback(200);
                                                    } else{
                                                        callback(500, {'Error': 'Could not update user data'});
                                                    }
                                                })
                                            } else{
                                                callback(500, {'Error': 'Could not find check ID'})
                                            }
                                        } else{
                                            callback(500, {'Error': 'Unable to locate user with the check'})
                                        }
                                    })
                                } else{
                                    callback(500, {'Error': 'Could not delete check'})
                                }
                            })
                        } else{
                            callback(403, {'Error': 'Token parsed is invalid'})
                        }
                    })
                } else{
                    callback(403, {'Error': 'Token is missing'});
                }
            } else{
                callback(404, {'Error': 'Check not found'})
            }
        })
    } else{
        callback(400, {'Error': 'Missing required field'});
    }
}

// Token handler to authenticate token
// Required data: id, phone
handlers._tokens.authToken = function(id, phone, callback){
    // Check if the token exists
    Data.read('tokens', id, function(err, tokdata){
        if (!err && tokdata){
            // Now we check if number is associated with the token
            if ((tokdata.phone === phone) && (tokdata.expiresIn > Date.now())){
                callback(true);
            } else{
                callback(false);
            }
        } else{
            callback(false)
        }
    })
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};


/*
 * HTML HANDLERS DEFINED HERE
 * 
 */

// Index handler function
handlers.index = function(data, callback){
    if (data.method === 'GET'){
        const indexData = {
            'head.title' : 'Home',
            'head.description' : 'Description goes here',
            'body.title' : 'Welcome UptimeChecker',
            'body.class' : 'index'
        };

        // Read in template as string
        helpers.getTemplate('index', indexData ,function(err, indexStr){
            if (!err && indexStr){
                // Include header and footer
                helpers.includeHeaderFooter(indexStr, indexData, function(err, fullString){
                    if (!err && fullString){
                        callback(200, fullString, 'html');
                    } else{
                        callback(500, undefined, 'html');
                    }
                })
            } else{
                callback(500, undefined, 'html')
            }
        })
    } else{
        callback(405, undefined, 'html')
    }
}

// Favicon handler
handlers.favicon = function(data, callback){
    // Only accept get requests
    if (data.method === 'GET'){
        helpers.getStaticAsset('favicon.ico', function(err, data){
            if (!err && data){
                callback(200, data, 'favicon');
            } else{
                callback(500);
            }
        })
    } else{
        callback(405);
    }
}

// Public assest handler
handlers.public = function(data, callback){
    if (data.method === 'GET'){
        // Get the file being requested
        const assetName = data.trimedUrl.replace('public/', '').trim();

        if (assetName.length > 0){
            // Read in the data
            helpers.getStaticAsset(assetName, function(err, data){
                if (!err && data){
                    let contentType = 'plain';

                    if (assetName.indexOf('.css') != -1){
                        contentType = 'css';
                    }
                    if (assetName.indexOf('.png' != -1)){
                        contentType = 'png';
                    }
                    if (assetName.indexOf('.jpg' != -1)){
                        contentType = 'jpg';
                    }
                    if (assetName.indexOf('ico' != -1)){
                        contentType = 'ico';
                    }
                } else{
                    callback(405);
                }

                callback(200, data, contentType);
            })
        } else{
            callback(400)
        }
    } else{
        callback(405)
    }
}

// Export module
module.exports = handlers;