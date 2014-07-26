videopress
=========

[![principe](http://aikah.online.fr/cdn/videopress/principe.png)](http://videopress.herokuapp.com/) [![detail](http://aikah.online.fr/cdn/videopress/detail.png)](http://videopress.herokuapp.com/video/53be064a585e54b00036147a)

author : mparaiso <mparaiso@online.fr>

###LIVE DEMO : http://videopress.herokuapp.com/

VIDEOPRESS is a cms allowing users to create playlists from various video web sites such as Youtube. 

### Changelog

### FEATURES

- built with nodejs

- backed by mongodb

- membership

- import and display videos from : 
	- Youtube
    - Vimeo

- create playlists from various video hosting services

- rest api to create videos and playlists

### DOCUMENTATION

#### INSTALLATION

- install git http://git-scm.com/

- install nodejs and npm http://nodejs.org/

- intstall mongodb http://www.mongodb.org/

- get a youtube api key https://developers.google.com/youtube/v3/getting-started

- clone the repository with git

	git clone https://github.com/Mparaiso/mpm.video

- add the following envirronment variables to your system : 

	- EXPRESS_VIDEO_MONGODB_CONNECTION_STRING : your mongodb connection string
	  
	  on a local mongodb installation , should be  mongodb://localhost

	- EXPRESS_VIDEO_YOUTUBE_API_KEY : your youtube api key 

	- SESSION_SECRET : a secret phrase for session encryption

- open a terminal, go to the project folder

- install packages with the npm install command

#### RUN

- you should be good to go , just type : node app.js in the project folder

- open a web browser to http://localhost:300

- go to /signup to create a new account



	



