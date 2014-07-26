// Generated by CoffeeScript 1.7.1
"use strict";
var container, path, pimple,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

pimple = require('pimple');

path = require('path');

container = new pimple({
  port: process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || 3000,
  ip: process.env.OPENSHIFT_NODEJS_IP,
  youtub_api_key: process.env.EXPRESS_VIDEO_YOUTUBE_API_KEY,
  connection_string: process.env.EXPRESS_VIDEO_MONGODB_CONNECTION_STRING,
  debug: process.env.NODE_ENV === "production" ? false : true,
  item_per_page: 26
});

container.register(require('./database'));

container.register(require('./controllers'));

container.register(require('./middlewares'));

container.register(require('./forms'));

container.register(require('./players'));

container.set("mixins", container.share(function() {
  return require('./mixins');
}));

container.set("parsers", container.share(function() {
  return require('./parsers');
}));

container.set("config", container.share(function() {
  return require('./config');
}));

container.set("express", container.share(function() {
  return require('express');
}));

container.set('_', container.share(function() {
  return require('lodash');
}));

container.set('q', container.share(function(c) {
  var q;
  q = require('q');
  if (c.debug) {
    q.longStackSupport = true;
  }
  return q;
}));

container.set("app", container.share(function(container) {
  var app, controllers, init, middlewares, sessionOptions;
  init = false;
  app = container.express();
  app.disable('x-powered-by');
  middlewares = container.middlewares;
  controllers = container.controllers;
  app.use(function(req, res, next) {
    return container.q().then((function() {
      if (!init) {
        container.Session;
        container.Category;
        container.User;
        container.Video;
        container.Playlist;
        init = true;
      }
    }))["catch"](function(err) {
      return err;
    }).done(next);
  });
  app.use(container.express["static"](path.join(__dirname, "..", "public"), container.config["static"]));
  app.engine('twig', container.swig.renderFile);
  app.set('view engine', 'twig');
  app.locals(container.locals);
  app.use(container.express.cookieParser(container.config.session.secret));
  sessionOptions = container._.extend({}, container.config.session, {
    store: container.sessionStore
  });
  app.use(container.express.session(sessionOptions));
  app.use(require('connect-flash')());
  app.use(container.express.bodyParser());
  app.use(container.passport.initialize());
  app.use(container.passport.session());
  app.use(container.express.compress());
  app.use(container.logger.middleware());
  if (container.debug) {
    app.enable('verbose errors');
    app.use(container.express.logger("dev"));
  } else {
    app.disable("verbose errors");
  }
  app.configure('testing', function() {
    return app.disable("verbose errors");
  });
  app.map = container.mixins.map;
  app.param('videoId', middlewares.video);
  app.param('playlistId', middlewares.playlist);

  /* protect profile pages */

  /* inject container into current request scope */
  app.use(function(req, res, next) {
    res.locals.container = container;
    return next();
  });
  app.use(middlewares.user);
  app.use(middlewares.flash);
  app.use('/profile', middlewares.isLoggedIn);
  app.use('/profile', middlewares.csrf);
  app.use('/login', middlewares.csrf);
  app.use('/signup', middlewares.csrf);
  app.use('/video', middlewares.csrf);
  app.map({
    "/": {
      get: controllers.index
    },
    "/video/:videoId": {
      get: controllers.videoById
    },
    "/playlist/:playlistId": {
      get: controllers.playlistById
    },
    "/category/:categoryId/:categoryTitle?": {
      get: [middlewares.categories, controllers.categoryById]
    },
    "/profile": {
      all: controllers.profile,
      "/video/new": {
        all: controllers.videoCreate
      },
      "/video": {
        all: controllers.videoList
      },
      "/video/:videoId/update": {
        all: [middlewares.belongsToUser(container.Video, 'video'), controllers.videoUpdate]
      },
      '/video/:videoId/remove': {
        post: [middlewares.belongsToUser(container.Video, 'video'), controllers.videoRemove]
      },
      '/playlist': {
        get: controllers.playlistList
      },
      '/playlist/:playlistId/update': {
        all: [middlewares.belongsToUser(container.Playlist, 'playlist'), controllers.playlistUpdate]
      },
      '/playlist/:playlistId/delete': {
        all: [middlewares.belongsToUser(container.Playlist, 'playlist'), controllers.playlistRemove]
      },
      '/playlist/new': {
        all: controllers.playlistCreate
      }
    },
    "/login": {
      get: controllers.login,
      post: container.passport.authenticate('local-login', {
        successRedirect: '/profile',
        failureRedirect: '/login',
        failureFlash: true
      })
    },
    "/signup": {
      get: controllers.signup,
      post: [
        controllers.signupPost, container.passport.authenticate('local-signup', {
          successRedirect: '/profile',
          failureRedirect: '/signup',
          failureFlash: true
        })
      ]
    },
    "/logout": {
      get: controllers.logout
    },
    "/search": {
      get: controllers.videoSearch
    }
  });
  if (!container.debug) {
    app.get('*', function(req, res, next) {
      return next(new container.errors.NotFound("page not found"));
    });
    app.use(middlewares.error);
  }
  app.on('error', function(err) {
    return container.logger.error(err);
  });
  return app;
}));

container.set("locals", container.share(function() {
  return {
    title: "videopress",
    logopath: "/images/video-big.png",
    paginate: function(array, length, start) {
      var divisions, _i, _results;
      if (start == null) {
        start = 0;
      }
      divisions = Math.ceil(array.length / length);
      return (function() {
        _results = [];
        for (var _i = start; start <= divisions ? _i < divisions : _i > divisions; start <= divisions ? _i++ : _i--){ _results.push(_i); }
        return _results;
      }).apply(this).map(function(i) {
        return array.slice(i * length, i * length + length);
      });
    }
  };
}));

container.set("swig", container.share(function(c) {
  var swig;
  swig = require('swig');
  swig.setDefaults({
    cache: c.debug ? false : "memory"
  });
  return swig;
}));

container.set("sessionStore", container.share(function() {
  var sessionStores;
  sessionStores = require('./session-stores');
  return new sessionStores.MongooseSessionStore({}, container.Session);
}));

container.set("monolog", container.share(function() {
  return require('monolog');
}));

container.set("logger", container.share(function(c) {
  var Logger, logger, monolog;
  monolog = c.monolog;
  Logger = monolog.Logger;
  logger = new Logger("express logger");
  logger.addHandler(new monolog.handler.StreamHandler(__dirname + "/../temp/log.txt", Logger.DEBUG));
  logger.addHandler(new monolog.handler.ConsoleLogHandler(Logger.INFO));
  logger.middleware = function(message) {
    var init;
    if (message == null) {
      message = "INFO";
    }
    init = false;
    return function(req, res, next) {
      if (!init) {
        logger.addProcessor(new monolog.processor.ExpressProcessor(req.app));
        init = true;
      }
      logger.debug("" + message + " " + req.method + " " + req.path);
      return next();
    };
  };
  return logger;
}));

container.set("passport", container.share(function() {
  var LocalStrategy, User, passport;
  passport = require('passport');
  LocalStrategy = require('passport-local').Strategy;
  User = container.User;
  passport.serializeUser(function(user, done) {
    return done(null, user.id);
  });
  passport.deserializeUser(function(id, done) {
    return User.findById(id, done);
  });
  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, function(req, email, password, done) {
    return process.nextTick(function() {
      return User.findOne({
        'local.email': email
      }, function(err, user) {
        var newUser;
        if (err) {
          done(err);
        }
        if (user) {
          return done(null, false, req.flash('signupMessage', 'That email is already taken'));
        } else {
          newUser = new User();
          newUser.username = req.body.username;
          newUser.local.email = email;
          newUser.local.password = newUser.generateHash(password);
          return newUser.save(done);
        }
      });
    });
  }));
  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, function(req, email, password, done) {
    return User.findOne({
      'local.email': email
    }, function(err, user) {
      if (err) {
        return done(err);
      }
      if (user) {
        if (user.validPassword(password)) {
          return done(null, user);
        }
      }
      return done(null, false, req.flash('loginMessage', 'Invalid credentials!'));
    });
  }));
  return passport;
}));

container.set("playerFactory", container.share(function(c) {
  return new c.players.PlayerFactory([c.players.Youtube, c.players.Vimeo]);
}));

container.set("errors", container.share(function() {
  return {
    NotFound: (function(_super) {
      __extends(_Class, _super);

      function _Class() {
        _Class.__super__.constructor.apply(this, arguments);
        this.status = 404;
      }

      return _Class;

    })(Error),
    Forbidden: (function(_super) {
      __extends(_Class, _super);

      function _Class() {
        _Class.__super__.constructor.apply(this, arguments);
        this.status = 500;
      }

      return _Class;

    })(Error)
  };
}));

module.exports = container;

//# sourceMappingURL=container.map
