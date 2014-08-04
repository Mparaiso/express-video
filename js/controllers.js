// Generated by CoffeeScript 1.7.1

/*
    Copyright © 2014 mparaiso <mparaiso@online.fr>. All Rights Reserved.
 */
module.exports = function(container) {
  return container.set('controllers', container.share(function(c) {
    var async, controllers, q, _;
    async = require('async');
    q = c.q;
    _ = c._;

    /*
     * CONTROLLERS
     */
    controllers = {};
    controllers.index = function(req, res, next) {
      var offset, skip;
      offset = !(isNaN(+req.query.offset) || typeof +req.query.offset !== "number") ? +req.query.offset : 0;
      skip = offset * c.item_per_page;
      return q.all([c.Video.findPublicVideos(null, null, null, skip), c.Category.whereVideoExist(), c.Playlist.getLatest()]).spread(function(videos, categories, playlists) {
        return res.render('index', {
          videos: videos,
          categories: categories,
          playlists: playlists,
          item_per_page: c.item_per_page,
          item_count: videos.length,
          offset: offset
        });
      })["catch"](function(err) {
        return next(err);
      });
    };
    controllers.videoById = function(req, res, next) {
      return q(c.Video.findSimilar(res.locals.video, {
        limit: 8
      })).then(function(videos) {
        return res.render('video', {
          videos: videos,
          player: c.playerFactory.fromVideo(res.locals.video)
        });
      })["catch"](function(err) {
        return next(_.extend(err, {
          status: 500
        }));
      });
    };

    /*
        PLAYLIST OPERATIONS
     */
    controllers.playlistList = function(req, res, next) {
      return q.ninvoke(c.Playlist, 'findByOwnerId', req.user.id).then(function(playlists) {
        return res.render('profile/playlist-list', {
          playlists: playlists
        });
      })["catch"](function(err) {
        return next(_.extend(err, [
          {
            status: 500
          }
        ]));
      });
    };
    controllers.playlistCreate = function(req, res, next) {
      return q(new c.Playlist()).then(function(playlist) {
        var form;
        form = c.forms.Playlist().setModel(playlist);
        if (req.method === "POST" && form.bind(req.body) && form.validateSync()) {
          playlist.owner = req.user.id;
          return c.Playlist.persist(playlist).then(function() {
            return res.redirect('/playlist/' + playlist.id);
          });
        } else {
          return res.render('profile/playlist-create', {
            form: form
          });
        }
      })["catch"](next);
    };

    /*
     * /profile/playlist/:playlistId/delete
     */
    controllers.playlistRemove = function(req, res, next) {
      var redirect;
      redirect = req.body._redirect || '/profile/playlist';
      return q.ninvoke(res.locals.playlist, 'remove').then((function() {
        return res.redirect(redirect);
      }), next);
    };
    controllers.playlistById = function(req, res, next) {
      return q().then(function() {
        var playlist, video;
        playlist = res.locals.playlist;
        video = _.find(playlist.videos, function(v) {
          return v.id === req.query.videoId;
        }) || playlist.getFirstVideo();
        if (video) {
          return [
            q.ninvoke(c.Video, 'populate', video, {
              path: "owner category"
            }), c.playerFactory.fromVideo(video), playlist
          ];
        } else {
          return [null, null, playlist];
        }
      }).spread(function(video, player, playlist) {
        return res.render('playlist', {
          playlist: playlist,
          video: video,
          player: player
        });
      }).done(_.noop, function(err) {
        return next(err);
      });
    };

    /*
     * VIDEO
     */
    controllers.videoCreate = function(req, res, next) {
      res.locals._csrf = req.csrfToken();
      return q.all([c.Category.find().exec(), {}]).spread(function(categories, model) {
        var form;
        form = c.forms.VideoCreate(categories).setModel(model);
        if (req.method === 'POST' && form.bind(req.body) && form.validateSync()) {
          return c.Video.fromUrl(model.url, {
            owner: req.user,
            category: model.category
          }).then(function(video) {
            return res.redirect('/video/' + video.id);
          });
        } else {
          return res.render('profile/video-create', {
            form: form
          });
        }
      })["catch"](next);
    };
    controllers.videoSearch = function(req, res, next) {
      var query;
      query = req.query.q ? new RegExp() : void 0;
      query.compile(req.query.q, 'i');
      return q(c.Video.findPublicVideos({
        description: query
      })).then(function(videos) {
        return res.render('search', {
          videos: videos,
          q: req.query.q
        });
      })["catch"](function(err) {
        return next(_.extend(err, {
          status: 500
        }));
      });
    };

    /*
     * /profile/video/videoId/update
     * user updates a video
     * requires middleware.video
     */
    controllers.videoUpdate = function(req, res, next) {
      return q(c.Category.find().exec()).then(function(categories) {
        var form;
        form = c.forms.Video(categories);
        form.setModel(res.locals.video);
        if (req.method === "POST" && form.bind(req.body) && form.validateSync()) {
          return c.Video.persist(res.locals.video).then(function() {
            return res.redirect('/video/' + req.params.videoId);
          });
        } else {
          return res.render('profile/video-update', {
            form: form
          });
        }
      })["catch"](next);
    };

    /*
     * /profile/videoRemove/:videoId/remove
     */
    controllers.videoDelete = function(req, res, next) {
      return res.locals.video.remove(function(err) {
        if (err) {
          err.status = 500;
          return next(err);
        } else {
          req.flash('success', 'video removed');
          return res.redirect('back');
        }
      });
    };

    /*
     * /profile/video
     */
    controllers.videoList = function(req, res, next) {
      return c.Video.findByOwnerId(req.user.id).then(function(videos) {
        return res.render('profile/video-list', {
          videos: videos
        });
      })["catch"](next);
    };

    /*
     * CATEGORIES
     */
    controllers.categoryById = function(req, res, next) {
      var offset, skip;
      offset = isNaN(+req.query.offset) || typeof +req.query.offset !== "number" ? 0 : +req.query.offset;
      skip = offset * c.item_per_page;
      return q.all([
        c.Category.findById(req.params.categoryId).exec(), c.Video.findPublicVideos({
          category: req.params.categoryId
        }, null, c.item_per_page, skip), c.Playlist.getLatest()
      ]).spread(function(category, videos, playlists) {
        return res.render('index', {
          videos: videos,
          category: category,
          playlists: playlists,
          pageTitle: "Latest videos in " + category.title,
          offset: offset,
          item_count: videos.length,
          item_per_page: c.item_per_page
        });
      })["catch"](function(err) {
        return next(err);
      });
    };

    /*
        ACCOUNTS
     */
    controllers.login = function(req, res, next) {
      var form;
      form = c.forms.Login(req.csrfToken());
      return res.render('login', {
        form: form
      });
    };
    controllers.signup = function(req, res) {
      var form, _csrf;
      _csrf = res.locals._csrf = req.csrfToken();
      form = c.forms.SignUp(_csrf);
      return res.render('signup', {
        form: form
      });
    };
    controllers.signupPost = function(req, res, next) {
      var form;
      form = c.forms.SignUp(req.csrfToken());
      form.bind(req.body);
      if (form.validateSync()) {
        req.body.password = req.body.password[0];
        return next();
      } else {
        return res.render('signup', {
          form: form
        });
      }
    };
    controllers.logout = function(req, res) {
      req.logout();
      return req.session.destroy(function() {
        return res.redirect('/');
      });
    };
    controllers.profile = {};
    controllers.profile.index = function(req, res, next) {
      res.locals._redirect = req.originalUrl;
      return q.all([q.ninvoke(c.Video, 'findByOwnerId', req.user.id), q.ninvoke(c.Playlist, 'findByOwnerId', req.user.id)]).spread(function(videos, playlists) {
        return res.render('profile/index', {
          videos: videos,
          playlists: playlists
        });
      })["catch"](function(err) {
        return next(_.extend(err, {
          status: 500
        }));
      });
    };
    controllers.profile.video = {};
    controllers.profile.video.actions = function(req, res, next) {
      return q().then(function() {
        if (req.method === "POST") {
          switch (req.body.action) {
            case "remove":
              return c.Video.removeMultiple(req.body.id);
          }
        }
      }).then(function() {
        return res.redirect('back');
      })["catch"](next);
    };
    controllers.profile.playlist = {};
    controllers.profile.playlist.fromUrl = function(req, res, next) {
      return c.Category.listAll().then(function(categories) {
        return [{}, c.forms.PlaylistFromUrl(categories)];
      }).spread(function(model, form) {
        form.setModel(model);
        if (req.method === "POST" && form.bind(req.body) && form.validateSync()) {
          return c.Playlist.fromUrl(model.url, {
            owner: req.user,
            category: model.category
          }).then(function(playlist) {
            return res.redirect('/playlist/' + playlist.id);
          });
        } else {
          return res.render('profile/playlist-fromurl', {
            form: form
          });
        }
      })["catch"](next);
    };
    controllers.profile.playlist.create = function(req, res, next) {
      req.flash('info', 'creating playlists has been momentarily deactivaed, please use "import playlist" sorry for any inconvenience');
      return res.redirect('back');
    };
    controllers.profile.playlist.update = function(req, res, next) {
      req.flash('info', 'Updating playlists has been momentarily deactivaed, sorry for any inconvenience');
      return res.redirect('back');
    };
    controllers.administration = {};
    controllers.administration.index = function(req, res, next) {};
    return controllers;
  }));
};

//# sourceMappingURL=controllers.map
