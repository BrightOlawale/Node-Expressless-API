// Create and export configuration variables

// General container for all environment
const environments = {};

// Staging (Default) environments
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'env': 'staging'
};

// Production environments
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'env': 'production'
};

// Check the environments passed 
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV : '';

// Check if currentEnvironment is in the environments container
const envToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;  

// Export the module
module.exports = envToExport;