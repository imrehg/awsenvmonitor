var BMP085 = require('bmp085'),
    awsIot = require('aws-iot-device-sdk'),
    later = require('later'),
    gpio = require('onoff'),
    awsoptions = require('./awsoptions');

console.log(awsoptions);

var baro_options = {
    "device" : "/dev/i2c-2",
    "mode": 3
};
var barometer = new BMP085(baro_options);

var Gpio = require('onoff').Gpio,
  led = new Gpio(8, 'out');

var thingShadows = awsIot.thingShadow(awsoptions);

var environmentStatus;

var manageReading = function(data) {
    var record = {
        "temperature": data.temperature,
        "pressure": data.pressure
    };
    console.log(record);
    environmentStatus = record;
    if (parseFloat(data.temperature) >= 27) {
        led.writeSync(1);
    } else {
        led.writeSync(0);
    }
};

var getReading = function() {
    barometer.read(manageReading);
};

thingShadows
    .on('connect', function() {
        console.log('connected to things instance, registering thing name');

        thingShadows.register( 'Reader01', {
            persistentSubscribe: true } );

        console.log('registered thing shadows...');

        getReading();
        var opClientToken = thingShadows.update('Reader01',
                                                { state: { desired: environmentStatus } });
    });


thingShadows
    .on('message', function(topic, payload) {
        console.log('message', topic, payload.toString());
    });

var updateStatus = function() {
    getReading();
    var opClientToken = thingShadows.update('Reader01',
                                            { state: { reported: environmentStatus } });
};

var textSched = later.parse.text('every 5 sec');
// Start the recurring task!
var timer = later.setInterval(updateStatus, textSched);
