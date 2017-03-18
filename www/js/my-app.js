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
              var abbr = trainHeadStationDataJSON[i].root.stations[0].station[0].abbr[0];
              tripDataJSON.trainHeadStations[abbr] = trainHeadStationDataJSON[i];
            }

            $$.post('https://bart.incognitech.in/api/routes/', tripDataJSON.scheduledTrips, function (routeData) {

              var routeDataJSON = JSON.parse(routeData);

              tripDataJSON.routes = {};
              for(var i = 0; i < routeDataJSON.length; i++) {
                var routeID = routeDataJSON[i].root.routes[0].route[0].routeID[0];
                tripDataJSON.routes[routeID] = routeDataJSON[i];
              }

              bartApp.tripData = tripDataJSON;

              var template = Template7.compile(content);

              var resultContent = template({
                tripData: tripDataJSON,
                realDate: moment(tripDataJSON.realTimeEstimates.root.date[0], 'MM-DD-YYYY').format('MMMM DD, YYYY'),
                realTime: tripDataJSON.realTimeEstimates.root.time,
                realTimeEstimates: tripDataJSON.realTimeEstimates.root.station[0].etd ? tripDataJSON.realTimeEstimates.root.station[0].etd.sort(function (a, b) {
                  var aMin = a.estimate[0].minutes[0];
                  var bMin = b.estimate[0].minutes[0];
                  if (aMin === 'Leaving') {
                    return -1;
                  }
                  if (bMin === 'Leaving') {
                    return 1;
                  }

                  if (parseInt(aMin) > parseInt(bMin)) {
                    return 1;
                  }

                  if (parseInt(aMin) < parseInt(bMin)) {
                    return -1;
                  }

                  return 0;
                }) : null,
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
  var tripData = bartApp.tripData;
  var realTimestamp = tripData.realTimeEstimates.root.date[0] + ' ' + tripData.realTimeEstimates.root.time;
  var realDate = moment(realTimestamp, 'MM-DD-YYYY HH:mm:ss A').add(parseInt(minutes), 'minutes');
  return '(<span data-countdown="' + moment(realDate).format('YYYY/MM/DD HH:mm:ss A') + '"></span>)';
});

Template7.registerHelper('tripMarkup', function(trip) {

  var tripData = bartApp.tripData;

  var markup = '';

  var noOfLegs = trip.leg.length;

  var stationCol = 'col-20';

  var arrowCol = 'col-60';

  for(var i = 0; i < trip.leg.length; i++) {

    if(i == 0) {
      markup += '<div class="' + stationCol + '"><h4><small>' + trip.leg[i].$.origin + '</small><br />' + trip.leg[i].$.origTimeMin + '</h4></div>';
    } else {
      markup += '<div class="' + stationCol + '"><h6><small>' + trip.leg[i].$.origin + '</small><br />' + trip.leg[i].$.origTimeMin + '</h6></div>';
    }

    markup += '<div class="' + arrowCol + '">';
    markup += '<div id="arrow-1" class="arrow-h-' + tripData.routes[trip.leg[i].$.line].root.routes[0].route[0].hexcolor[0].toUpperCase() + '">';
    markup += '<h4>';
    markup += tripData.trainHeadStations[trip.leg[i].$.trainHeadStation].root.stations[0].station[0].name + ' ';

    var bikeflag = trip.leg[i].$.bikeflag;
    if (bikeflag === '1') {
      markup += '<div class="chip open-popover" data-popover=".popover-bike"><div class="chip-label"><i class="fa fa-bicycle bg-info"></i></div></div>';
    }
    var load = parseInt(trip.leg[i].$.load);
    if (load > 0) {
      markup += ' <div class="chip open-popover" data-popover=".popover-load"><div class="chip-label">';
      for(var j = 0; j < load; j++) {
        markup += ' <i class="fa fa-user bg-info"></i>';
      }
      markup += '</div></div>';
    }

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
      markup += '<br /><div class="chip open-popover" data-popover=".popover-transfer-' + trip.leg[i].$.transfercode + '"><div class="chip-label">' + trip.leg[i].$.transfercode + '</div></div>';
      markup += '</h6>';
      markup += '</div>';
    }

  }

  return markup;
});

Template7.registerHelper('tripTitle', function (trip) {
  var modalTitle = trip.$.origin;
  for(var i = 0; i < trip.leg.length; i++) {
    modalTitle += ( ' <i class="fa fa-long-arrow-right"></i> ' + trip.leg[i].$.destination);
  }
  return modalTitle;
});

Template7.registerHelper('isSelectedSource', function (abbr) {
  var selected = '';
  if (typeof(Storage) !== "undefined") {
    selected = localStorage.getItem('source') === abbr ? 'selected="selected"' : '';
  }
  return selected;
});

Template7.registerHelper('isSelectedDestination', function (abbr) {
  var selected = '';
  if (typeof(Storage) !== "undefined") {
    selected = localStorage.getItem('destination') === abbr ? 'selected="selected"' : '';
  }
  return selected;
});

Template7.registerHelper('getTripDataUrl', function () {
  var url = 'tripData.html?source=&destination=';
  if (typeof(Storage) !== "undefined") {
    var source = localStorage.getItem('source');
    var destination = localStorage.getItem('destination');

    if(source === null || typeof source != 'string' || source === '') {
      source = '';
    }

    if(destination === null || typeof destination != 'string' || destination === '') {
      destination = '';
    }

    url = 'tripData.html?source=' + source + '&destination=' + destination;
  }
  return url;
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
  bartApp.countDownIntervalIds = [];
  bartApp.refreshInterval = null;
  bartApp.bartDirectionsDisplay = null;
  bartApp.bartDirectionsService = null;
});

bartApp.onPageInit('station', function (app, page) {
  $$('.navbar .navbar-inner .center').html(bartApp.station.name);

  if (bartApp.mapLoaded) {
    var position = new google.maps.LatLng(bartApp.station.gtfs_latitude[0], bartApp.station.gtfs_longitude[0]);
    var map = new google.maps.Map(document.getElementById('stationMap'), {
      zoom: 16,
      center: position
    });
    var marker = new google.maps.Marker({
      position: position,
      map: map
    });
    map.panTo(position);
  }
});

bartApp.onPageInit('trip', function (app, page) {

  if (typeof(Storage) !== "undefined") {
    $$('#source').val(localStorage.getItem('source')).change();
    $$('#destination').val(localStorage.getItem('destination')).change();
  }

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

    bartApp.source = source;
    bartApp.destination = destination;

    if (typeof(Storage) !== "undefined") {
      localStorage.setItem('source', source);
      localStorage.setItem('destination', destination);
    } else {
      // Sorry! No Web Storage support..
    }

  });
});

bartApp.onPageInit('tripData', function (app) {

  $$(bartApp.countDownIntervalIds).each(function (item, i) {
    clearInterval(item);
  });

  $$('[data-countdown]').each(function() {
    var $this = $$(this);

    var finalDate = moment($this.data('countdown'), 'YYYY/MM/DD hh:mm:ss A');
    var now = moment(new Date(), 'YYYY/MM/DD hh:mm:ss A');
    var diff = finalDate.format('X') - now.format('X');
    var duration = moment.duration(diff * 1000, 'milliseconds');
    var interval = 1000;

    bartApp.countDownIntervalIds.push(setInterval(function () {
      if(duration - interval !== 0) {
        duration = moment.duration(duration - interval, 'milliseconds');
        $this.html(duration.hours() + ":" + duration.minutes() + ":" + duration.seconds());
      }
    }, interval));
  });

  clearInterval(bartApp.refreshInterval);

  bartApp.refreshInterval = setInterval(function () {

    var source = bartApp.source;
    var destination = bartApp.destination;

    if (source && destination && source !== '' && destination !== '' && source !== destination ) {
      mainView.router.refreshPage();
    }

  }, 30000);

  $$('.open-trip-map').on('click', function (e) {
    bartApp.popup('.trip-map-popup');
    $$('.trip-map-popup').data('trip-index', $$(e.target).data('trip-index'));
  });

  $$('.trip-map-popup').on('popup:opened', function (e) {

    var popup = $$(e.target); // Button that triggered the modal
    var tripIndex = popup.data('trip-index'); // Extract info from data-* attributes
    var tripData = bartApp.tripData;
    var trip = tripData.scheduledTrips.root.schedule[0].request[0].trip[tripIndex];
    var modalTitle = trip.$.origin;

    var originLat = tripData.trainHeadStations[trip.$.origin].root.stations[0].station[0].gtfs_latitude[0];
    var originLong = tripData.trainHeadStations[trip.$.origin].root.stations[0].station[0].gtfs_longitude[0];
    var destLat = tripData.trainHeadStations[trip.$.destination].root.stations[0].station[0].gtfs_latitude[0];
    var destLong = tripData.trainHeadStations[trip.$.destination].root.stations[0].station[0].gtfs_longitude[0];

    for(var i = 0; i < trip.leg.length; i++) {
      modalTitle += ( ' <i class="fa fa-long-arrow-right"></i> ' + trip.leg[i].$.destination);
    }

    $$('#tripMapModalLabel').html(modalTitle);

    if (bartApp.mapLoaded) {
      var bounds = new google.maps.LatLngBounds();

      for(var i = 0; i < trip.leg.length; i++) {
        var lat = tripData.trainHeadStations[trip.leg[i].$.destination].root.stations[0].station[0].gtfs_latitude[0];
        var long = tripData.trainHeadStations[trip.leg[i].$.destination].root.stations[0].station[0].gtfs_longitude[0];
        var latLong = new google.maps.LatLng(lat, long);
        bounds.extend(latLong);
      }

      var originLatLong = new google.maps.LatLng(originLat, originLong);
      var destinationLatLong = new google.maps.LatLng(destLat, destLong);
      bounds.extend(originLatLong);
      bounds.extend(destinationLatLong);

      var map = new google.maps.Map(document.getElementById('tripMap'), {
        zoom: 16,
        center: originLatLong
      });

      google.maps.event.trigger(map, 'resize');

      map.fitBounds(bounds);       // auto-zoom
      map.panToBounds(bounds);     // auto-center

      if(bartApp.bartDirectionsDisplay != null) {
        bartApp.bartDirectionsDisplay.setMap(null);
        bartApp.bartDirectionsDisplay = null;
        bartApp.bartDirectionsService = null;
      }

      bartApp.bartDirectionsDisplay = new google.maps.DirectionsRenderer;
      bartApp.bartDirectionsService = new google.maps.DirectionsService;

      bartApp.bartDirectionsDisplay.setMap(map);

      bartApp.bartDirectionsService.route({
        origin: {lat: parseFloat(originLat), lng: parseFloat(originLong)},
        destination: {lat: parseFloat(destLat), lng: parseFloat(destLong)},
        travelMode: google.maps.TravelMode['TRANSIT'],
      }, function(response, status) {
        if (status == 'OK') {
          bartApp.bartDirectionsDisplay.setDirections(response);
        } else {
          bartApp.alert('Directions request failed due to ' + status);
        }
      });
    }

  });

});

bartApp.initMap = function () {
  bartApp.mapLoaded = true;
};