const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');



const showController = require('./controllers/show');
const userController = require('./controllers/user');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

mongoose.connect('mongodb://localhost:27017/ngtvdb')
mongoose.connection.on('error', (error) => console.error(error));
mongoose.connection.on('open', () => console.log("success in connecting to mongodb"));

app.post('/auth/signup', userController.postNewUser);
app.post('/auth/login', userController.postLoginUser);
app.post('/auth/facebook', userController.postLoginFacebook);
app.post('/auth/google', userController.postLoginGoogle);
app.get('/api/users', userController.getUser);

app.get('/api/tvdb', showController.getShowsFromTVDB);
app.get('/api/shows', showController.getAllShowsFromDb);
app.get('/api/shows/:id', showController.getShowsById);
app.post('/api/shows', showController.postNewShow);
app.post('/api/add/dbShows', showController.postShowInMongo);
/*app.post('/api/shows/subscribe', userController.ensureAuthenticated, showController.postSubscribe);
app.post('/api/shows/unsubscribe', userController.ensureAuthenticated, showController.postUnSubscribe);*/

module.exports = app;