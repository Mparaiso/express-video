###
    Copyright © 2014 mparaiso <mparaiso@online.fr>. All Rights Reserved.
###
util = require('util')
_ = require('lodash')

###
	PRODUCTION
###
config ={
    brand:"videopress"
    connection_string: process.env.VIDEOPRESS_MONGODB_CONNECTION_STRING,
    youtube_apikey: process.env.VIDEOPRESS_YOUTUBE_API_KEY,
    vimeo_access_token: process.env.VIDEOPRESS_VIMEO_ACCESS_TOKEN,
    port: process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000 ,
    ip: process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
    mongoose_debug: false,
    session:{
        cookie:{maxAge:1000*60*60*24,httpOnly:true}
        key:"videopress"
        secret:process.env.SESSION_SECRET
    }
}
if process.env.NODE_ENV == "production"
    _.extend(config,{
        static:{
            maxAge:1000*60*60*24
        }
    })
### 
	TESTING
###
if process.env.NODE_ENV == "testing"
    _.extend(config,{
        connection_string: process.env.EXPRESS_VIDEO_MONGODB_CONNECTION_STRING_TEST,
        mongoose_debug: false
    })

module.exports = config
