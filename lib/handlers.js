// Description: Request handlers defined here

// Dependencies
const Data = require("./dataLogic");
const helpers = require("./helpers");

// Define handlers
const handlers = {};

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
    }
    handlers._users[data.method](data, callback);
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
    };

    // We are going to be storing each user's data in a file named after their phone number E.g: 08174555662.json
    // So we can verify if a user exist by checking if their phone number is already named as a file in our data folder by trying to read a file named after thier phone
    // If user already exist, we should get an error.
    Data.read('users', phone, function(err, data){
        if (err){
            // First, let's hash the password
            const hashedPassword = helpers.hash(password);

            if (!hashedPassword) {
                callback(400, {'Error': "Couldn't hash the password"});
            };

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
                };

                // If successful
                callback(200);
            })           
        } else {
            callback(400, {'Error': 'User already exists'});
        }
    })
};

// Users GET method
// Required data: phone
handlers._users.GET = function(data, callback){
    // Verify phone
    const phone = typeof(data.query.phone) === 'string' && (data.query.phone.trim().length > 0 && data.query.phone.trim().length <=15) ? data.query.phone.trim() : false;

    if(phone){
        // If phone is correctly verified read the data
        Data.read('users', phone, function(err, data){
            if(!err && data){
                // Remove the hash password from the data object
                delete data.password;
                callback(200, data);
            } else{
                callback(404); // Data not found
            }
        })
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
        // Check if phone is in our record
        Data.read('users', phone, function(err, data){
            if (!err && data){
                Data.delete('users', phone, function(err){
                    if(!err){
                        callback(200);
                    } else{
                        callback(500, {'Error': 'Could not delete user'});
                    }
                })
            } else{
                callback(404, {'Error': 'User does not exist'});
            }
        })
    } else{
        callback(400, {'Error': 'Missing required field'});
    }
};

// Not found handler
handlers.notFound = function(data, callback){
    callback(404);
};

// Export module
module.exports = handlers;