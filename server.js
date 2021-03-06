var http = require("http")
var path = require('path')
var express = require("express")
//var mongoose = require("mongoose")
//var consolidate = require("consolidate")
//var _ = require("underscore")
//var Driver = require('./models/driver.js')
var bodyParser = require('body-parser')
//var routes = require('./routes')
var mongoClient = require("mongodb").MongoClient
var app = express()
var expressLayouts = require('express-ejs-layouts')
var uuid = require("uuid")
var bcrypt = require('bcryptjs')
const jwt = require('simple-jwt')
const locals = {
    title: "Ahora",
    text: "Ahora es una red voluntaria de visualización de transporte público en tiempo real."
}


/*
app.use(bodyParser.urlencoded({
    extended: true,
}))

app.use(bodyParser.json({
    limit: '5mb'
}))
*/

app.set('views', path.join(__dirname, 'views'))
app.use(express.static('./static')) //setting the folder name (public) where all the static files like css, js, images etc are made available
app.set('view engine', 'ejs')
app.set('layout extractScripts', true)
app.set('layout extractStyles', true)

app.use(expressLayouts);

//app.engine('html', consolidate.underscore) //Use underscore to parse templates when we do res.render

var server = http.Server(app)
, portNumber = 8000
, io = require('socket.io')(server) //Creating a new socket.io instance by passing the HTTP server object

server.listen(portNumber, function() { //Runs the server on port 8000
    console.log('Server listening at http://localhost:' + portNumber)

    var url = 'mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.PORT+'/'+process.env.DB;

    mongoClient.connect(url,{ useNewUrlParser: true },(err,database) =>{ 

        if (err) return console.log(err)

        console.log("Connected to Database")

        app.get('/', function(req, res) {
            //console.log("/");
            res.locals = locals
            res.locals.path = req.path;               
            res.render('index',{ uuid : uuid.v4() })
        });

        app.post('/log', function(req, res) {
            //console.log("/log")
            res.locals = locals
            res.locals.path = req.path;            
            res.render('log', {
                uuid: req.query.uuid
            });
        });

        app.post('/register', function(req, res) {
          
            var hashedPassword = bcrypt.hashSync(req.body.password, 8);
            var users = db.collection('users');

            users.create({
                name : req.body.name,
                email : req.body.email,
                password : hashedPassword
            },
            function (err, user) {
                if (err) return res.status(500).send("There was a problem registering the user.")

                // create a token
                var token = jwt.encode({ id: user._id }, config.secret, {
                    expiresIn: 86400 // expires in 24 hours
                });

                res.status(200).send({ auth: true, token: token });
            }); 
        });

        app.get('/mapa', function(req, res) { //a request to /user will render our user page
            //console.log("/mapa")
            res.locals = locals
            res.locals.path = req.path;
            res.render('mapa', { 
                layout: 'fullscreen',
                uuid : uuid.v4()
            });
        });

        app.get('/drivers/info', function(req, res) {
            var id = req.query.id
            var db = database.db('ahorabondi')
            var pid = id.split('-')[0]

            db.collection("drivers").findOneAndUpdate({
                "uuid": id
            }, {
                $set : {
                    "uuid": id,
                    "displayName":pid,
                    "customMsg":"",
                    "location": {
                        "type" : "Point",
                        "address" : "C1203AAA CABA Av. Rivadavia 2899, Argentina",
                        "coordinates" : [
                            -58.405758,
                            -34.6103905            
                        ]
                    }
                }
            }, {
                returnOriginal: false, 
                upsert: true
            }, function(err,result) {

                if(err){
                    console.log(err)
                }

                res.json({
                    driverDetails: result.value
                })
            })
        })

        app.get('/data', function(req, res) {
            //console.log("/data")
            res.locals = locals
            res.locals.path = req.path;
            res.render('data', { layout: 'fullscreen' });
        })

        app.get('/quiero-participar', function(req, res) {
            console.log("/quiero-participar");
            res.locals = locals
            res.locals.path = req.path;            
            res.render('quiero-participar',{ uuid : uuid.v4() });
        })

        app.get('/preguntas-frecuentes', function(req, res) {
            console.log("/preguntas-frecuentes");
            res.locals = locals
            res.locals.path = req.path;            
            res.render('preguntas-frecuentes');
        })

        app.post('/signin', function(req, res) {
            console.log("/signin");
            res.locals = locals
            res.locals.path = req.path;            
            res.render('preguntas-frecuentes');
        })

        app.post('/signup', function(req, res) {
            console.log("/signup");
            res.locals = locals
            res.locals.path = req.path;            
            res.render('preguntas-frecuentes');
        })

        app.get('/:id', function(req, res) {
            console.log("/emisor/" + req.params.id);
            res.locals = locals
            res.locals.path = req.path;
            res.render('emisor', {
                layout: 'fullscreen',
                uuid: req.params.id,
                displayName: req.params.id.split('-')[0]
            })
        })
        
        /*
        var drivers = db.collection('drivers');

        console.log("Seeding Database")

        drivers.insert(driversData, function(err, result) {
            if(err) throw err;
            console.log("Database seeded")
        })*/

        io.on('connection', function(socket) { //Listen on the 'connection' event for incoming sockets
            //console.log('A user just connected')

            socket.on('join', function(data) { //Listen to any join event from connected users
                socket.join("map") //User joins a unique room/channel that's named after the uuid 
                //console.log("User join")
            });

            //Listen to a 'position' event from connected users
            socket.on('location', function(data) {
                //console.log("location: " + data.location.longitude+' '+ data.location.latitude + ' (' + data.uuid + ')')
                io.sockets.emit("location",data)
            })

            socket.on('forcedisconnect', function (data) {
                //console.log('User has disconnected.');
                //console.log(data);
                io.sockets.emit("disconnect",data)
                socket.disconnect();
            })
        });
    });
});

/* 1. Not all the template engines work uniformly with express, hence this library in js, (consolidate), is used to make the template engines work uniformly. Altough it doesn't have any 
modules of its own and any template engine to be used should be seprately installed!*/