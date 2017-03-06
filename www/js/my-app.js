// Initialize app
var bartApp = new Framework7({
  swipePanel: 'left',
  // template7Pages: true,
  // preprocess: function (content, url, next) {
  //   if (url === 'stations.html') {
  //     // For example, we will retreive template JSON data using Ajax and only after that we will continue page loading process
  //     $$.get('https://bart.incognitech.in/api/stations/', function(data) {
  //       // Template
  //       var template = Template7.compile(content);
  //
  //       var stations = JSON.parse(data);
  //
  //       // Compile content template with received JSON data
  //       var resultContent = template({stations: stations.root.stations[0].station});
  //
  //       // Now we call "next" callback function with result content
  //       next(resultContent);
  //     });
  //     // Now we shouldn't return anything
  //   }
  // }
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

bartApp.onPageInit('stations', function (page) {

  var template = $$('script#station-list-template').html();
  var compiledTemplate = Template7.compile(template);

  $$.get('https://bart.incognitech.in/api/stations/', function(data) {

    var stations = JSON.parse(data);

    // Compile content template with received JSON data
    var resultContent = compiledTemplate({stations: stations.root.stations[0].station});

    $$('.page[data-page=stations] .page-content .content-block').append(resultContent);
  });

});
