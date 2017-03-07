// Initialize app
var bartApp = new Framework7({
  swipePanel: 'left',
  template7Pages: true,
  preprocess: function (content, url, next) {
    var purlObj = purl(url);
    if (purlObj.data.attr.base === 'stations.html') {
      // For example, we will retreive template JSON data using Ajax and only after that we will continue page loading process
      $$.get('https://bart.incognitech.in/api/stations/', function(data) {
        // Template
        var template = Template7.compile(content);

        var stations = JSON.parse(data);

        // Compile content template with received JSON data
        var resultContent = template({stations: stations.root.stations[0].station});

        // Now we call "next" callback function with result content
        next(resultContent);
      });
      // Now we shouldn't return anything
    } else if (purlObj.data.attr.base === 'station.html') {
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

      var compiledTemplate = Template7.compile(content);

      $$.get('https://bart.incognitech.in/api/station/' + stn_abbr, function(data) {

        var template = Template7.compile(content);

        var station = JSON.parse(data);
        bartApp.station = station.root.stations[0].station[0];

        // Compile content template with received JSON data
        var resultContent = compiledTemplate({station: bartApp.station});

        // Now we call "next" callback function with result content
        next(resultContent);
      });
      // Now we shouldn't return anything
    } else {
      return content;
    }
  }
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