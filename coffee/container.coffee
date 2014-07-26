"use strict"

pimple = require 'pimple'
path = require 'path'

container = new pimple
    port: process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000 ,
    ip: process.env.OPENSHIFT_NODEJS_IP ,
    youtub_api_key: process.env.EXPRESS_VIDEO_YOUTUBE_API_KEY,
    connection_string: process.env.EXPRESS_VIDEO_MONGODB_CONNECTION_STRING,
    debug: if process.env.NODE_ENV == "production" then false else true

# service providers
container.register require './database'
container.register require './controllers'
container.register require './middlewares'
container.register require './forms'
container.register require './players'
# node modules
container.set "mixins", container.share -> require './mixins'
container.set "parsers",container.share -> require './parsers'
container.set "config",container.share  -> require './config'
container.set "express",container.share -> require 'express'
container.set '_',container.share -> require 'lodash'
container.set 'q',container.share (c)->
    q = require 'q'
    if c.debug
        q.longStackSupport = true
    return q

container.set "app", container.share (container)->
    init = false
    app = container.express()
    middlewares = container.middlewares
    controllers = container.controllers
    app.use (req,res,next)->
        container.q()
        .then (->
            # init models
            if not init
                container.Session
                container.Category
                container.User
                container.Video
                container.Playlist
                init = true
            return )
        .catch((err)-> err)
        .done next
    app.use(container.express.static(path.join(__dirname, "..", "public"),{maxAge:10000}))
    app.engine('twig',container.swig.renderFile)
    app.set('view engine', 'twig')
    app.locals(container.locals)
    app.use(container.express.cookieParser("secret sentence"))
    app.use(container.express.session({store:container.sessionStore}))
    app.use( require('connect-flash')())
    app.use(container.express.bodyParser())
    app.use(container.passport.initialize())
    app.use(container.passport.session())
    # persistent session login
    app.use(container.express.compress())
    app.use(container.logger.middleware())

    if container.debug 
        app.enable('verbose errors')
        app.use(container.express.logger("dev"))
    else
        app.disable("verbose errors")

    app.configure 'testing', ->
        app.disable("verbose errors")

    app.map = container.mixins.map
    
    app.param('videoId',middlewares.video)
    app.param('playlistId',middlewares.playlist)
    ### protect profile pages ###
    ### inject container into current request scope ###
    app.use((req,res,next)->
        res.locals.container=container
        next()
    )
    app.use(middlewares.user)
    app.use(middlewares.flash)
    app.use('/profile',middlewares.isLoggedIn)
    app.use('/profile',middlewares.csrf)
    app.use('/login',middlewares.csrf)
    app.use('/signup',middlewares.csrf)
    app.use('/video',middlewares.csrf)
    
    app.map
        "/":
            get:controllers.index
        # @TODO rethink apis
        #"/api/video":
        #    use: middlewares.videoApi
        #"/api/video.fromUrl":
        #    post: controllers.videoFromUrl
        #"/api/playlist":
        #    use: middlewares.playlistApi
        "/video/:videoId":
            get:controllers.videoById
        "/playlist/:playlistId":
            get:controllers.playlistById
        "/category/:categoryId/:categoryTitle?":
            get:[middlewares.categories,controllers.categoryById]
        "/profile":
            all:controllers.profile
            "/video/new":
                all:controllers.videoCreate
            "/video":
                all:controllers.videoList
            "/video/:videoId/update":
                all:[middlewares.belongsToUser(container.Video,'video'),
                    controllers.videoUpdate]
            '/video/:videoId/remove':
                post:[middlewares.belongsToUser(container.Video,'video')
                    controllers.videoRemove]
            '/playlist':
                get:controllers.playlistList
            '/playlist/:playlistId/update':
                all:[middlewares.belongsToUser(container.Playlist,'playlist'),
                    controllers.playlistUpdate]
            '/playlist/:playlistId/delete':
                all:[middlewares.belongsToUser(container.Playlist,'playlist'),
                    controllers.playlistRemove]
            '/playlist/new':
                all:controllers.playlistCreate
        "/login":
            get:controllers.login
            post:container.passport.authenticate('local-login',{
                successRedirect:'/profile',
                failureRedirect:'/login',
                failureFlash:true
                })
        "/signup":
            get:controllers.signup
            post:[controllers.signupPost,container.passport.authenticate('local-signup',{
                successRedirect:'/profile',
                failureRedirect:'/signup',
                failureFlash:true
            })]
        #erase user credentials
        "/logout":
            get:controllers.logout
        #search videos by title
        "/search":
            get:controllers.videoSearch

    if not container.debug
        #middleware for errors if not debug
        app.use(middlewares.error)

    app.on 'error',(err)->
        container.logger.error(err)

    return app

container.set "locals", container.share ->
    title: "videopress",
    logopath:"/images/video-big.png",
    paginate: (array, length, start = 0)->
        divisions = Math.ceil(array.length / length)
        [start...divisions].map (i)->
            array.slice(i * length, i * length + length)

container.set "swig", container.share (c)->
    swig = require 'swig'
    swig.setDefaults({cache: if c.debug then false else "memory"})
    return swig

container.set "sessionStore",container.share ->
    sessionStores = require './session-stores'
    new sessionStores.MongooseSessionStore({},container.Session)

container.set "monolog", container.share ->require 'monolog'
container.set "logger", container.share (c)->
    monolog = c.monolog
    Logger = monolog.Logger
    logger = new Logger("express logger")
    logger.addHandler(new monolog.handler.StreamHandler(__dirname + "/../temp/log.txt",Logger.DEBUG))
    logger.addHandler(new monolog.handler.ConsoleLogHandler(Logger.INFO))
    logger.middleware = (message = "INFO")->
        init = false
        return (req, res, next)->
            if not init
                logger.addProcessor(new monolog.processor.ExpressProcessor(req.app))
                init = true
            logger.debug("#{message} #{req.method} #{req.path}")
            next()
    return logger


container.set "passport", container.share ->
    passport = require 'passport'
    LocalStrategy = require('passport-local').Strategy
    User = container.User
    passport.serializeUser (user,done)->done(null,user.id)
    passport.deserializeUser (id,done)->User.findById(id,done)
    passport.use 'local-signup', new LocalStrategy({
        usernameField:'email',
        passwordField:'password',
        passReqToCallback:true
    },(req,email,password,done)->
        process.nextTick ->
            User.findOne 'local.email':email,(err,user)->
                if err  then done(err)
                if user
                    done(null,false,req.flash('signupMessage','That email is already taken'))
                else
                    newUser = new User()
                    newUser.username = req.body.username
                    newUser.local.email = email
                    newUser.local.password = newUser.generateHash(password)
                    newUser.save(done)
    )
    passport.use 'local-login',new LocalStrategy({
        usernameField:'email',
        passwordField:'password',
        passReqToCallback:true
    },(req,email,password,done)->
        User.findOne {'local.email':email},(err,user)->
            if err then return done(err)
            if user 
                if user.validPassword(password)
                    return done(null,user)
            return done(null,false,req.flash('loginMessage','Invalid credentials!'))
    )
    return passport
container.set "playerFactory",container.share (c)->
    new c.players.PlayerFactory [c.players.Youtube,c.players.Vimeo]


module.exports = container
