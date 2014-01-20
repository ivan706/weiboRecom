/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , PRONAME = require('./package.json').name
  , PROHOME = __dirname;


var app = express()

app.configure(function(){
  app.set('port', process.env.PORT || 3000)
  app.set('views', PROHOME + '/views')
  app.set('view engine', 'ejs')
  app.set('project_home', PROHOME) // 项目路径
  app.use(express.favicon())
  app.use(express.static(path.join(PROHOME, 'public')))
  app.use(express.cookieParser())
  app.use(express.session({secret: PRONAME}));
  app.use(express.bodyParser({keepExtensions: true}))
  app.use(express.methodOverride())
  app.use(app.router)
})

app.configure('development', function(){
  app.use(express.errorHandler())
})

routes(app)

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'))
})
