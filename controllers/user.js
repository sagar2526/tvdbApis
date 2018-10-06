const User = require('../models/user');
const config = require('../config')
var jwt = require('jwt-simple');
const crypto = require('crypto');

var moment = require('moment');

function createJwtToken(user) {
  var payload = {
    user: user,
    iat: new Date().getTime(),
    exp: moment().add('days', 7).valueOf()
  };
  return jwt.encode(payload, config.tokenSecret);
} 

exports.postNewUser = (req, res, next) => {
    var user = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    });
    user.save(function(err) {
        if (err) return next(err);
        res.send(200);
    });
};

exports.postLoginUser = (req, res, next) => {
    User.findOne({
        email: req.body.email
    }, function(err, user) {
        if (!user) return res.send(401, 'User does not exist');
        user.comparePassword(req.body.password, function(err, isMatch) {
            if (!isMatch) return res.send(401, 'Invalid email and/or password');
            var token = createJwtToken(user);
            res.send({
                token: token
            });
        });
    });
};

exports.postLoginFacebook = (req, res, next) => {
    var profile = req.body.profile;
    var signedRequest = req.body.signedRequest;
    var encodedSignature = signedRequest.split('.')[0];
    var payload = signedRequest.split('.')[1];

    var appSecret = '298fb6c080fda239b809ae418bf49700';

    var expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('base64');
    expectedSignature = expectedSignature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    if (encodedSignature !== expectedSignature) {
        return res.send(400, 'Invalid Request Signature');
    }

    User.findOne({
        facebook: profile.id
    }, function(err, existingUser) {
        if (existingUser) {
            var token = createJwtToken(existingUser);
            return res.send(token);
        }
        var user = new User({
            name: profile.name,
            facebook: {
                id: profile.id,
                email: profile.email
            }
        });
        user.save(function(err) {
            if (err) return next(err);
            var token = createJwtToken(user);
            res.send(token);
        });
    });
};

exports.postLoginGoogle = (req, res, next) => {
    var profile = req.body.profile;
    User.findOne({
        google: profile.id
    }, function(err, existingUser) {
        if (existingUser) {
            var token = createJwtToken(existingUser);
            return res.send(token);
        }
        var user = new User({
            name: profile.displayName,
            google: {
                id: profile.id,
                email: profile.emails[0].value
            }
        });
        user.save(function(err) {
            if (err) return next(err);
            var token = createJwtToken(user);
            res.send(token);
        });
    });
};

exports.getUser = (req, res, next) => {
    if (!req.query.email) {
        return res.send(400, {
            message: 'Email parameter is required.'
        });
    }

    User.findOne({
        email: req.query.email
    }, function(err, user) {
        if (err) return next(err);
        res.send({
            available: !user
        });
    });
};

exports.ensureAuthenticated = (req, res, next) => {
  if (req.headers.authorization) {
    var token = req.headers.authorization.split(' ')[1];
    try {
      var decoded = jwt.decode(token, config.tokenSecret);
      if (decoded.exp <= Date.now()) {
        res.send(400, 'Access token has expired');
      } else {
        req.user = decoded.user;
        return next();
      }
    } catch (err) {
      return res.send(500, 'Error parsing token');
    }
  } else {
    return res.send(401);
  }
}