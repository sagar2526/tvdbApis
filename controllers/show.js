const Show = require('../models/show');
const request = require('request');
const rp = require('request-promise-native')
const async = require('async');
const xml2js = require('xml2js');

exports.getShowsFromTVDB = function(req, res) {
    var seriesName = req.query.search
    var apiKey = '9EF1D1E7D28FDA0B';
    const parser = require('xml2js').Parser({
        explicitArray: false,
        normalizeTags: true
    });
    /* request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + req.query.search,
         function(err, response, body) {
             if (err) throw err;
             const parser = require('xml2js').Parser({
                 explicitArray: false,
                 normalizeTags: true
             });
             parser.parseString(body, function(err, result) {

                 /* detailsURL = blogurl + apikey + seriesId
                  request.get (detailsURL, function () {
                      
                  })*/

    /* console.log(typeof result)
                     res.json({
                         data: result.data.series
                     })
            });*/
    //res.send(body)
    var p = rp.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + req.query.search)
        .then(function(body) {
            return new Promise(function(rs, rj) {
                parser.parseString(body, function(err, result) {
                    if (!result.data.series) {
                        return res.send(400, {

                            message: req.query.search + ' was not found.'
                        });
                    }
                    var seriesIds = []
                    if (Array.isArray(result.data.series))
                        seriesIds = result.data.series.map(function(series) {
                            return series.seriesid
                        })
                    else
                        seriesIds = [result.data.series.seriesid];
                    rs(seriesIds)


                });

            })

        }).then(function(seriesIds) {
            var url = 'http://thetvdb.com/api/' + apiKey + '/series/%id%/all/en.xml';
            var URL = [];

            return Promise.all(seriesIds.map(function(id) {
                console.log(url.replace('%id%', id))
                return rp(url.replace('%id%', id));
            }))
        }).then(function(shows) {
            var promiseArray = shows.map(function(show) {
                return new Promise(function(rs, rj) {
                    parser.parseString(show, function(err, results) {
                        console.log(err)
                        rs(results.data.series) 

                    })
                })

            })

            return Promise.all( promiseArray)
        }).then(function (data) {
            res.json({data})
        })
        .catch(function(error) {
            console.log(error);
            if (error) throw error;

        })
}

exports.postShowInMongo = (req,res) =>{
    console.log(req);
    var show = new Show({
        _id: req.body.id,
        name: req.body.seriesname,
        airsDayOfWeek: req.body.airs_dayofweek,
        airsTime: req.body.airs_time,
        firstAired: req.body.firstaired,
        genre: req.body.genre.split('|').filter(Boolean),
        network: req.body.network,
        overview: req.body.overview,
        rating: req.body.rating,
        ratingCount: req.body.ratingcount,
        runtime: req.body.runtime,
        status: req.body.status,
        poster: req.body.poster,
        episodes: []
    });
    /* _.each(episodes, function(episode) {
        show.episodes.push({
            season: episode.seasonnumber,
            episodeNumber: episode.episodenumber,
            episodeName: episode.episodename,
            firstAired: episode.firstaired,
            overview: episode.overview
        });
    }); */
    show.save().then((show) => {
       console.log("Added Successfully")
       res.json(show);
    }).catch((error) =>{
        if (error) throw error;
    });
}

exports.getAllShowsFromDb = (req, res, next) => {
    Show.find().exec(function (error, shows) {
        if (error) {
            throw err;
        }
        if (shows) {
            res.json({
                data: shows
            });
        }
        else {
            res.json({
                message: "No Data have been found."
            });
        }
    });
};

exports.getShowsById = (req, res, next) => {
    Show.findById(req.params.id, function(err, show) {
        if (err) return next(err);
        res.send(show);
    });
};

exports.postNewShow = (req, res, next) => {
    var seriesName = req.body.showName
        .toLowerCase()
        .replace(/ /g, '_')
        .replace(/[^\w-]+/g, '');
    var apiKey = '9EF1D1E7D28FDA0B';
    var parser = xml2js.Parser({
        explicitArray: false,
        normalizeTags: true
    });

    async.waterfall([
        function(callback) {
            request.get('http://thetvdb.com/api/GetSeries.php?seriesname=' + seriesName, function(error, response, body) {
                if (error) return next(error);
                parser.parseString(body, function(err, result) {
                    if (!result.data.series) {
                        return res.send(400, {
                            message: req.body.showName + ' was not found.'
                        });
                    }
                    var seriesId = result.data.series.seriesid || result.data.series[0].seriesid;
                    callback(err, seriesId);
                });
            });
        },
        function(seriesId, callback) {
            request.get('http://thetvdb.com/api/' + apiKey + '/series/' + seriesId + '/all/en.xml', function(error, response, body) {
                if (error) return next(error);
                parser.parseString(body, function(err, result) {
                    var series = result.data.series;
                    var episodes = result.data.episode;
                    var show = new Show({
                        _id: series.id,
                        name: series.seriesname,
                        airsDayOfWeek: series.airs_dayofweek,
                        airsTime: series.airs_time,
                        firstAired: series.firstaired,
                        genre: series.genre.split('|').filter(Boolean),
                        network: series.network,
                        overview: series.overview,
                        rating: series.rating,
                        ratingCount: series.ratingcount,
                        runtime: series.runtime,
                        status: series.status,
                        poster: series.poster,
                        episodes: []
                    });
                    _.each(episodes, function(episode) {
                        show.episodes.push({
                            season: episode.seasonnumber,
                            episodeNumber: episode.episodenumber,
                            episodeName: episode.episodename,
                            firstAired: episode.firstaired,
                            overview: episode.overview
                        });
                    });
                    callback(err, show);
                });
            });
        },
        function(show, callback) {
            var url = 'http://thetvdb.com/banners/' + show.poster;
            request({
                url: url,
                encoding: null
            }, function(error, response, body) {
                show.poster = 'data:' + response.headers['content-type'] + ';base64,' + body.toString('base64');
                callback(error, show);
            });
        }
    ], function(err, show) {
        if (err) return next(err);
        show.save(function(err) {
            if (err) {
                if (err.code == 11000) {
                    return res.send(409, {
                        message: show.name + ' already exists.'
                    });
                }
                return next(err);
            }
            /*var alertDate = Sugar.Date.create('Next ' + show.airsDayOfWeek + ' at ' + show.airsTime).rewind({
                hour: 2
            });
            agenda.schedule(alertDate, 'send email alert', show.name).repeatEvery('1 week');*/
            res.send(200);
        });
    });
};

/*exports.postSubscribe = (req, res, next) => {
    Show.findById(req.body.showId, function(err, show) {
        if (err) return next(err);
        show.subscribers.push(req.user._id);
        show.save(function(err) {
            if (err) return next(err);
            res.send(200);
        });
    });
};

exports.postUnSubscribe = (req, res, next) => {
    Show.findById(req.body.showId, function(err, show) {
        if (err) return next(err);
        var index = show.subscribers.indexOf(req.user._id);
        show.subscribers.splice(index, 1);
        show.save(function(err) {
            if (err) return next(err);
            res.send(200);
        });
    });
}*/