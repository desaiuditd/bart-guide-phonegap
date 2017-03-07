// Initialize app
var bartApp = new Framework7({
  swipePanel: 'left',
  template7Pages: true,
  preprocess: function (content, url, next) {
    var purlObj = purl(url);
    switch (purlObj.data.attr.base) {
      case 'stations.html':

        bartApp.showPreloader();

        // For example, we will retreive template JSON data using Ajax and only after that we will continue page loading process
        $$.get('https://bart.incognitech.in/api/stations/', function(data) {
          // Template
          var template = Template7.compile(content);

          var stations = JSON.parse(data);

          // Compile content template with received JSON data
          var resultContent = template({stations: stations.root.stations[0].station});

          // Now we call "next" callback function with result content
          next(resultContent);

          bartApp.hidePreloader();

        });
        // Now we shouldn't return anything
        break;
      case 'station.html':
        // For example, we will retreive template JSON data using Ajax and only after that we will continue page loading process
        var stn_abbr = '';
        if(purlObj.data.param.query
          && purlObj.data.param.query.stn_abbr
          && typeof purlObj.data.param.query.stn_abbr === 'string'
          && purlObj.data.param.query.stn_abbr.length > 0) {
          stn_abbr = purlObj.data.param.query.stn_abbr;
        }

        if (stn_abbr === '') {
          bartApp.alert('Oops ! No station found !', 'BART Guide', function () {
            window.location = '/';
          });
          return;
        }

        bartApp.showPreloader();

        $$.get('https://bart.incognitech.in/api/station/' + stn_abbr, function(data) {

          var template = Template7.compile(content);

          var station = JSON.parse(data);
          bartApp.station = station.root.stations[0].station[0];

          // Compile content template with received JSON data
          var resultContent = template({station: bartApp.station});

          // Now we call "next" callback function with result content
          next(resultContent);

          bartApp.hidePreloader();

        });
        // Now we shouldn't return anything
        break;
      case 'trip.html':

        bartApp.showPreloader();

        $$.get('https://bart.incognitech.in/api/stations/', function(data) {
          // Template
          var template = Template7.compile(content);

          var stations = JSON.parse(data);

          // Compile content template with received JSON data
          var resultContent = template({stations: stations.root.stations[0].station});

          // Now we call "next" callback function with result content
          next(resultContent);

          bartApp.hidePreloader();

        });
        break;
      case 'tripData.html':
        var source = '';
        var destination = '';
        if(purlObj.data.param.query
          && purlObj.data.param.query.source
          && typeof purlObj.data.param.query.source === 'string'
          && purlObj.data.param.query.source.length > 0) {
          source = purlObj.data.param.query.source;
        }
        if(purlObj.data.param.query
          && purlObj.data.param.query.destination
          && typeof purlObj.data.param.query.destination === 'string'
          && purlObj.data.param.query.destination.length > 0) {
          destination = purlObj.data.param.query.destination;
        }

        if (source === '' || destination === '') {
          bartApp.alert('Oops ! No stations found !', 'BART Guide', function () {
            window.location = '/trip.html';
          });
          return;
        }

        bartApp.showPreloader();

        $$.get('https://bart.incognitech.in/api/trips/' + source + '/' + destination + '/', function(tripData) {

          var tripDataJSON = JSON.parse(tripData);

          $$.post('https://bart.incognitech.in/api/trainHeadStationData/', tripDataJSON.scheduledTrips, function (trainHeadStationData) {

            var trainHeadStationDataJSON = JSON.parse(trainHeadStationData);

            tripDataJSON.trainHeadStations = {};
            for(var i = 0; i < trainHeadStationDataJSON.length; i++) {
              const abbr = trainHeadStationDataJSON[i].root.stations[0].station[0].abbr[0];
              tripDataJSON.trainHeadStations[abbr] = trainHeadStationDataJSON[i];
            }

            $$.post('https://bart.incognitech.in/api/routes/', tripDataJSON.scheduledTrips, function (routeData) {

              var routeDataJSON = JSON.parse(routeData);

              tripDataJSON.routes = {};
              for(var i = 0; i < routeDataJSON.length; i++) {
                const routeID = routeDataJSON[i].root.routes[0].route[0].routeID[0];
                tripDataJSON.routes[routeID] = routeDataJSON[i];
              }

              bartApp.tripData = tripDataJSON;

              var template = Template7.compile(content);

              var resultContent = template({
                tripData: tripDataJSON,
                realDate: moment(tripDataJSON.realTimeEstimates.root.date[0], 'MM-DD-YYYY').format('MMMM DD, YYYY'),
                realTime: tripDataJSON.realTimeEstimates.root.time,
                realTimeEstimates: tripDataJSON.realTimeEstimates.root.station[0].etd,
                trips: tripDataJSON.scheduledTrips.root.schedule[0].request[0].trip,
                co2emission: tripDataJSON.scheduledTrips.root.message[0].co2_emissions,
                specialSchedule: tripDataJSON.scheduledTrips.root.message[0].special_schedule,
              });

              next(resultContent);

              bartApp.hidePreloader();
            });
          });
        });

        break;
      default:
        return content;
        break;
    }
  }
});

Template7.registerHelper('getRealTimeEstimateMinutes', function (minutes) {
  if (minutes === 'Leaving') {
    return 'Leaving';
  }
  return '<span class="real-time-remained">' + minutes + '</span> minutes';
});

Template7.registerHelper('getRealTimeCountdown', function (minutes) {
  if (minutes === 'Leaving') {
    return '';
  }
  const tripData = Session.get('tripData');
  const realTimestamp = tripData.realTimeEstimates.root.date[0] + ' ' + tripData.realTimeEstimates.root.time;
  const realDate = moment(realTimestamp, 'MM-DD-YYYY HH:mm:ss A').add(parseInt(minutes), 'minutes');
  return '(<span data-countdown="' + moment(realDate).format('YYYY/MM/DD HH:mm:ss A') + '"></span>)';
});

Template7.registerHelper('tripMarkup', function(trip) {

  var tripData = bartApp.tripData;

  var markup = '';
  const transfercodemessage = {
    N: 'Normal Transfer.',
    T: 'Timed Transfer. Connecting trains will wait up to five minutes for transferring passengers.',
    S: 'Scheduled Transfer. Connecting trains will NOT wait for transferring passengers if there is a delay.',
  };

  const noOfLegs = trip.leg.length;

  var stationCol = 'col-xs-2 col-sm-1';

  var arrowCol = 8;

  for(var i = 0; i < trip.leg.length; i++) {

    if(i == 0) {
      markup += '<div class="' + stationCol + ' text-center"><h4><small>' + trip.leg[i].$.origin + '</small><br />' + trip.leg[i].$.origTimeMin + '</h4></div>';
    } else if(is.mobile()) {
      markup += '<div class="' + stationCol + ' text-center"><h6><small>' + trip.leg[i].$.origin + '</small><br />' + trip.leg[i].$.origTimeMin + '</h6></div>';
    }

    markup += '<div class="col-xs-' + arrowCol + '">';
    markup += '<div id="arrow-1" class="arrow-h-' + tripData.routes[trip.leg[i].$.line].root.routes[0].route[0].hexcolor[0].toUpperCase() + '">';
    markup += '<h4 class="text-center">';
    markup += tripData.trainHeadStations[trip.leg[i].$.trainHeadStation].root.stations[0].station[0].name;
    markup += ' <span class="text-info"> ';
    const bikeflag = trip.leg[i].$.bikeflag;
    if (bikeflag === '1') {
      markup += '<i class="fa fa-bicycle bg-info" data-toggle="tooltip" title="Bikes are allowed on this train."></i>';
    }
    const load = parseInt(trip.leg[i].$.load);
    for(var j = 0; j < load; j++) {
      markup += '<i class="fa fa-user bg-info" data-toggle="tooltip" title="This shows how full the train is at this time."></i>';
    }
    markup += '</span>';
    markup += '</h4>';
    markup += '</div>';
    markup += '</div>';

    if(i == trip.leg.length-1) {
      markup += '<div class="' + stationCol + ' text-center">';
      markup += '<h4>';
      markup += '<small>' + trip.leg[i].$.destination + '</small><br />';
      markup += trip.leg[i].$.destTimeMin;
      markup += '</h4>';
      markup += '</div>';
    } else {
      markup += '<div class="' + stationCol + ' text-center">';
      markup += '<h6>';
      markup += '<small>' + trip.leg[i].$.destination + '</small><br />';
      markup += trip.leg[i].$.destTimeMin;
      markup += '<br /><span class="lead trasfercode bg-info text-info" data-toggle="tooltip" title="' + transfercodemessage[trip.leg[i].$.transfercode] + '">' + trip.leg[i].$.transfercode + '</span>';
      markup += '</h6>';
      markup += '</div>';
    }

  }

  return markup;
});

// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

// Add view
var mainView = bartApp.addView('.view-main', {
  // Because we want to use dynamic navbar, we need to enable it for this view:
  dynamicNavbar: true
});

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
  console.log("Device is ready!");
});

bartApp.onPageInit('station', function () {
  $$('.navbar .navbar-inner .center').html(bartApp.station.name);
});

bartApp.onPageInit('trip', function (app, page) {

  function setGoUrl(e) {
    var source = $$('#source').val();
    var destination = $$('#destination').val();
    $$('#btn-trip-go').attr('href', 'tripData.html?source=' + source + '&destination=' + destination);
  }

  $$('#source').on('change', setGoUrl);
  $$('#destination').on('change', setGoUrl);

  $$('#btn-trip-go').on('click', function (e) {

    var source = $$('#source').val();
    var destination = $$('#destination').val();

    if (source === '') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      bartApp.alert('Select a source station.', 'BART Guide');
      return false;
    } else if (destination === '') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      bartApp.alert('Select a destination station.', 'BART Guide');
      return false;
    } else if (source === destination) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      bartApp.alert('Select different station for destination.', 'BART Guide');
      return false;
    }

  });
});

/**
 *
 * *localhost*
 * *localhost:3000*
 * *bart.incognitech.in*
 * *localhost/*
 * *localhost:3000/*
 * *bart.incognitech.in/*
 * file:///* /www/index.html
 */
bartApp.initMap = function () {
  console.log(window.location);
  console.log("YOYO");
  var uluru = {lat: -25.363, lng: 131.044};
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 4,
    center: uluru
  });
  var marker = new google.maps.Marker({
    position: uluru,
    map: map
  });
};